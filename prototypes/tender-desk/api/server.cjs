// Team-only catalog. Collection runs in the separate Python worker.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const { gzipSync } = require('node:zlib');
const { TeamStore, AuthError, SESSION_MS } = require('./auth.cjs');

const MAX_FEED_BYTES = 12_000_000;
const MAX_AGE_MS = 36 * 3600 * 1000;
const SOURCE_FIELDS = ['key', 'name', 'region', 'url', 'coverage', 'lastAttemptAt',
  'lastSuccessAt', 'pagesChecked', 'detailErrors', 'detailsChecked',
  'detailLimitReached', 'listingComplete', 'status', 'count', 'error', 'publicationDate',
  'edition', 'pagesExpected', 'pagesFetched', 'pagesProcessed', 'candidateCount', 'reviewCount'];
const TENDER_FIELDS = ['id', 'reference', 'sourceKey', 'title', 'buyer', 'region',
  'sourceUrl', 'publishedAt', 'closingAt', 'datePrecision', 'procurementType',
  'amendmentFlag', 'detailUrl', 'detailVerifiedAt', 'deadlineWarning', 'detailWarning',
  'deadlineBasis', 'firstSeenAt', 'lastSeenAt', 'eligibility', 'listed', 'sourceName', 'sourceStatus',
  'reviewStatus', 'newspaper', 'edition', 'page', 'ocrText', 'evidenceId'];
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'self'",
};
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const pick = (value, keys) => Object.fromEntries(keys.filter(key => isObject(value) && Object.hasOwn(value, key)).map(key => [key, value[key]]));

function publicFeed(data) {
  if (!isObject(data) || data.schemaVersion !== 1 ||
      !Array.isArray(data.sources) || !Array.isArray(data.tenders) ||
      ![...data.sources, ...data.tenders].every(isObject)) throw new Error('Invalid snapshot');
  return {
    ...pick(data, ['schemaVersion', 'generatedAt', 'coverageNote']),
    ...(isObject(data.pilot) ? { pilot: { ...pick(data.pilot, ['startDate', 'endDate', 'status', 'daysCollected', 'daysExpected', 'coverageNote']),
      days: (data.pilot.days ?? []).filter(isObject).map(day => pick(day, ['date', 'expectedEditions', 'completeEditions', 'partialEditions', 'unavailableEditions', 'candidates', 'pagesProcessed'])) } } : {}),
    schedule: pick(data.schedule, ['time', 'timezone', 'frequency']),
    sources: data.sources.map(source => pick(source, SOURCE_FIELDS)),
    tenders: data.tenders.map(item => ({
      ...pick(item, TENDER_FIELDS),
      documents: (item.documents ?? []).filter(isObject).map(document => pick(document, ['label', 'url'])),
      advertisements: (item.advertisements ?? []).filter(isObject).map(ad => pick(ad, ['label', 'url', 'sourceUrl', 'reference'])),
      matches: (item.matches ?? []).filter(isObject).map(match => pick(match, ['category', 'keyword'])),
      location: pick(item.location, ['city', 'basis']),
      changes: (item.changes ?? []).filter(change => isObject(change) && isObject(change.fields)).slice(0, 5).map(change => ({
        recordedAt: change.recordedAt,
        fields: Object.fromEntries(Object.entries(change.fields)
          .filter(([key, value]) => ['title', 'closingAt', 'datePrecision', 'amendmentFlag'].includes(key) && isObject(value))
          .map(([key, value]) => [key, pick(value, ['before', 'after'])])),
      })),
    })),
  };
}

const signature = stat => [stat.dev, stat.ino, stat.size, stat.mtimeNs].join(':');

class SnapshotStore {
  constructor(filename, clock) {
    this.filename = filename;
    this.clock = clock;
    this.variants = new Map();
  }

  async refresh() {
    const stat = await fs.stat(this.filename, { bigint: true });
    if (stat.size > MAX_FEED_BYTES) throw new Error('Oversized snapshot');
    if (this.signature === signature(stat)) return;
    const file = await fs.open(this.filename, 'r');
    let opened, data;
    try {
      // Associate the cache with the file actually opened across atomic swaps.
      opened = await file.stat({ bigint: true });
      if (opened.size > MAX_FEED_BYTES) throw new Error('Oversized snapshot');
      const buffer = Buffer.alloc(Math.min(Number(opened.size) + 1, MAX_FEED_BYTES + 1));
      let offset = 0;
      while (offset < buffer.length) {
        const { bytesRead } = await file.read(buffer, offset, buffer.length - offset, null);
        if (!bytesRead) break;
        offset += bytesRead;
      }
      // Collector only replaces snapshots atomically; reject an in-place growth.
      if (offset > Number(opened.size)) throw new Error('Snapshot changed during read');
      data = publicFeed(JSON.parse(buffer.subarray(0, offset).toString('utf8')));
    } finally {
      await file.close();
    }
    if (typeof data.generatedAt !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(data.generatedAt)) throw new Error('Missing timestamp zone');
    const generated = Date.parse(data.generatedAt);
    if (!Number.isFinite(generated)) throw new Error('Invalid timestamp');
    this.payload = data;
    this.generated = generated;
    this.signature = signature(opened);
    this.variants.clear();
  }

  async read(compressed = false) {
    // Concurrent requests share filesystem refresh work.
    this.loading ??= this.refresh().finally(() => { this.loading = null; });
    await this.loading;
    // A newspaper refresh must not hide an overdue official-source collector.
    const overdue = this.payload.sources.filter(source => !source.edition && source.status === 'connected' &&
      source.lastSuccessAt && this.clock() - Date.parse(source.lastSuccessAt) > MAX_AGE_MS).map(source => source.key);
    const stale = this.clock() - this.generated > MAX_AGE_MS || overdue.length > 0;
    const key = `${stale}:${overdue.join(',')}:${compressed}`;
    if (!this.variants.has(key)) {
      let body = Buffer.from(JSON.stringify({ ...this.payload, stale,
        sources: this.payload.sources.map(source => overdue.includes(source.key) ? { ...source, status: 'stale' } : source),
        tenders: this.payload.tenders.map(tender => overdue.includes(tender.sourceKey) ? { ...tender, sourceStatus: 'stale' } : tender),
      }));
      // LiteSpeed can decompress upstream gzip for identity clients. A weak
      // validator identifies equivalent JSON across those wire transformations.
      const etag = `W/"${createHash('sha256').update(body).digest('hex')}"`;
      if (compressed) body = gzipSync(body, { level: 6 });
      this.variants.set(key, { body, etag, stale });
    }
    return this.variants.get(key);
  }
}

function quality(header, name) {
  const values = new Map();
  for (const part of header.toLowerCase().split(',')) {
    const [coding, ...parameters] = part.trim().split(';');
    let value = 1;
    for (const parameter of parameters) {
      if (parameter.trim().startsWith('q=')) value = Number(parameter.trim().slice(2));
    }
    values.set(coding, Number.isFinite(value) && value >= 0 && value <= 1 ? value : 0);
  }
  return values.get(name) ?? values.get('*') ?? (name === 'identity' ? 1 : 0);
}

function etagMatches(header, etag) {
  return header.split(',').some(value => ['*', etag.replace(/^W\//, '')].includes(value.trim().replace(/^W\//, '')));
}

const CONTENT_TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' };

function createServer({ snapshot = process.env.MERITX_FEED_PATH || path.join(os.homedir(), '.meritx-tender-engine/data/feed.json'),
  frontend = path.resolve(__dirname, '..'), clock = Date.now,
  evidenceRoot = path.join(path.dirname(snapshot), 'newspapers/evidence'),
  team = new TeamStore(process.env.MERITX_TEAM_PATH || path.join(os.homedir(), '.meritx-tender-engine/team.json'), clock),
  publicOrigin = process.env.MERITX_PUBLIC_ORIGIN || 'https://tenders.meritxsc.com',
  allowedHosts = (process.env.MERITX_ALLOWED_HOSTS || 'tenders.meritxsc.com,localhost,127.0.0.1').split(',').map(host => host.trim().toLowerCase()),
  logError = () => console.warn('Tender snapshot unavailable'),
} = {}) {
  const store = new SnapshotStore(snapshot, clock);
  const assets = path.join(frontend, 'assets');
  const originUrl = new URL(publicOrigin);
  if (originUrl.protocol !== 'https:' && !(originUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(originUrl.hostname))) throw new Error('Team access requires HTTPS or a loopback preview');
  const origin = originUrl.origin;
  const cookieName = origin.startsWith('https:') ? '__Host-meritx_session' : 'meritx_session';
  const cookie = (value, maxAge = SESSION_MS / 1000) => `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${origin.startsWith('https:') ? '; Secure' : ''}`;
  const server = http.createServer(async (request, response) => {
    const send = (status, body = '', headers = {}) => {
      const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body);
      response.writeHead(status, { ...SECURITY_HEADERS, 'Cache-Control': 'no-store',
        ...(status === 304 ? {} : { 'Content-Length': bytes.length }), ...headers });
      response.end(request.method === 'HEAD' || status === 304 ? undefined : bytes);
    };
    const json = (status, value, headers = {}) => send(status, JSON.stringify(value), { 'Content-Type': 'application/json; charset=utf-8', ...headers });
    const host = /^([a-z0-9.-]+)(?::\d+)?$/i.exec(request.headers.host || '')?.[1]?.toLowerCase();
    if (!host || !allowedHosts.includes(host)) return send(400, 'Invalid host');
    let pathname;
    try {
      pathname = decodeURIComponent(request.url.split('?')[0]);
      if (!pathname.startsWith('/') || pathname.includes('\0') || pathname.includes('\\')) throw new Error('Invalid path');
    } catch { return send(400, 'Invalid path'); }
    if (pathname === '/healthz') return json(200, { status: 'ok' });
    const authRoute = ['/api/auth/login', '/api/auth/activate', '/api/auth/logout', '/api/team/invite', '/api/team/disable'].includes(pathname);
    if (!['GET', 'HEAD'].includes(request.method) && !(request.method === 'POST' && authRoute)) return send(405, 'Method not allowed', { Allow: authRoute ? 'POST' : 'GET, HEAD' });
    const secret = (request.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(cookieName + '='))?.slice(cookieName.length + 1) || '';
    const publicFile = ['/login', '/activate'].includes(pathname);
    let session;
    try {
      if (pathname.startsWith('/api/') && request.method === 'POST') {
        if (request.headers.origin !== origin || request.headers['content-type']?.split(';')[0] !== 'application/json') return json(403, { error: 'Reload this page and try again.' });
        let size = 0, chunks = [];
        for await (const chunk of request) {
          size += chunk.length;
          if (size > 4096) return json(413, { error: 'Request is too large.' });
          chunks.push(chunk);
        }
        let input;
        try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (!isObject(input)) throw new Error(); }
        catch { return json(400, { error: 'Enter valid account details.' }); }
        if (pathname === '/api/auth/login' || pathname === '/api/auth/activate') {
          const remote = request.socket.remoteAddress || 'unknown'; // Never trust arbitrary forwarded IP headers.
          const result = pathname.endsWith('/login') ? await team.login(input.email, input.password, remote) : await team.activate(input.token, input.password, remote);
          return json(200, { user: result.user, csrf: result.csrf }, { 'Set-Cookie': cookie(result.secret) });
        }
        session = await team.authenticate(secret);
        if (!session) return json(401, { error: 'Please sign in.' });
        if (request.headers['x-csrf-token'] !== session.csrf) return json(403, { error: 'Reload this page and try again.' });
        if (pathname === '/api/auth/logout') {
          await team.logout(secret);
          return json(200, { status: 'signed-out' }, { 'Set-Cookie': cookie('', 0) });
        }
        if (session.user.role !== 'admin') return json(403, { error: 'Administrator access is required.' });
        if (pathname === '/api/team/invite') {
          if (typeof input.email === 'string' && input.email.trim().toLowerCase() === session.user.email) return json(400, { error: 'Ask another administrator to reset your access. This screen cannot reset your own account.' });
          const result = await team.invite(input.email, input.name, input.role);
          return json(201, { user: result.user, expiresAt: result.expiresAt, activationUrl: `${origin}/activate#${result.token}` });
        }
        await team.disable(input.id);
        return json(200, { status: 'disabled' });
      }
      if (!publicFile && !pathname.startsWith('/assets/')) {
        session = await team.authenticate(secret);
        if (!session) return pathname === '/' || pathname === '/team' ? send(302, '', { Location: '/login' }) : json(401, { error: 'Please sign in.' });
      }
      if (pathname === '/api/auth/session') return json(200, session);
      if (/^\/api\/evidence\/[a-f0-9]{64}\.png$/.test(pathname)) {
        try {
          const root = await fs.realpath(evidenceRoot);
          const filename = await fs.realpath(path.join(root, path.basename(pathname)));
          if (!filename.startsWith(root + path.sep)) return send(404, 'Not found');
          const file = await fs.open(filename, 'r');
          try {
            const stat = await file.stat();
            if (!stat.isFile() || stat.size > MAX_FEED_BYTES) return send(404, 'Not found');
            return send(200, await file.readFile(), { 'Content-Type': 'image/png', 'Content-Disposition': 'inline', 'Cache-Control': 'private, no-store' });
          } finally { await file.close(); }
        } catch { return send(404, 'Not found'); }
      }
      if (pathname === '/api/team') {
        if (session.user.role !== 'admin') return json(403, { error: 'Administrator access is required.' });
        return json(200, { users: await team.list() });
      }
      if (pathname === '/team' && session.user.role !== 'admin') return send(403, 'Administrator access is required.');
    } catch (error) {
      return json(error instanceof AuthError ? error.status : 503, { error: error instanceof AuthError ? error.message : 'Team access is temporarily unavailable. Please try again shortly.' });
    }
    if (pathname === '/api/tenders' || pathname === '/readyz') {
      const accept = request.headers['accept-encoding'] || '';
      const compressed = pathname === '/api/tenders' && quality(accept, 'gzip') > 0;
      if (pathname === '/api/tenders' && !compressed && quality(accept, 'identity') === 0) return json(406, { error: 'Accept gzip or identity encoding.' });
      try {
        const representation = await store.read(compressed);
        if (pathname === '/readyz') return json(200, { status: representation.stale ? 'stale' : 'ready', stale: representation.stale });
        const headers = { ETag: representation.etag, Vary: 'Accept-Encoding, Cookie', 'Cache-Control': 'private, no-store',
          ...(compressed ? { 'Content-Encoding': 'gzip' } : {}) };
        if (etagMatches(request.headers['if-none-match'] || '', representation.etag)) return send(304, '', headers);
        return send(200, representation.body, { ...headers, 'Content-Type': 'application/json; charset=utf-8' });
      } catch {
        logError();
        return json(503, { error: 'The tender feed is not ready. Please try again shortly.' }, { 'Retry-After': '300' });
      }
    }
    // No generic repository file server. Resolve symlinks before checking assets.
    let filename;
    if (pathname === '/') filename = path.join(frontend, 'index.html');
    else if (publicFile) filename = path.join(frontend, 'login.html');
    else if (pathname === '/team') filename = path.join(frontend, 'team.html');
    else if (pathname.startsWith('/assets/') && !pathname.split('/').some(part => part.startsWith('.'))) {
      try {
        const root = await fs.realpath(assets);
        const candidate = await fs.realpath(path.join(frontend, pathname));
        if (candidate.startsWith(root + path.sep)) filename = candidate;
      } catch { /* Unknown assets return 404. */ }
    }
    if (!filename) return send(404, 'Not found');
    try {
      const body = await fs.readFile(filename);
      return send(200, body, { 'Content-Type': CONTENT_TYPES[path.extname(filename)] || 'application/octet-stream',
        'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=3600' : 'private, no-store' });
    } catch { return send(404, 'Not found'); }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.maxHeadersCount = 60;
  return server;
}

module.exports = { createServer, MAX_FEED_BYTES };
