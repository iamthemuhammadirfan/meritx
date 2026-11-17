// Read-only public catalog API. Collection runs in the separate Python worker.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const { gzipSync } = require('node:zlib');

const MAX_FEED_BYTES = 12_000_000;
const MAX_AGE_MS = 36 * 3600 * 1000;
const SOURCE_FIELDS = ['key', 'name', 'region', 'url', 'coverage', 'lastAttemptAt',
  'lastSuccessAt', 'pagesChecked', 'detailErrors', 'detailsChecked',
  'detailLimitReached', 'listingComplete', 'status', 'count', 'error'];
const TENDER_FIELDS = ['id', 'reference', 'sourceKey', 'title', 'buyer', 'region',
  'sourceUrl', 'publishedAt', 'closingAt', 'datePrecision', 'procurementType',
  'amendmentFlag', 'detailUrl', 'detailVerifiedAt', 'deadlineWarning', 'detailWarning',
  'deadlineBasis', 'firstSeenAt', 'lastSeenAt', 'eligibility', 'listed', 'sourceName', 'sourceStatus'];
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
    const stale = this.clock() - this.generated > MAX_AGE_MS;
    const key = `${stale}:${compressed}`;
    if (!this.variants.has(key)) {
      let body = Buffer.from(JSON.stringify({ ...this.payload, stale }));
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
  allowedHosts = (process.env.MERITX_ALLOWED_HOSTS || 'tenders.meritxsc.com,localhost,127.0.0.1').split(',').map(host => host.trim().toLowerCase()),
  logError = () => console.warn('Tender snapshot unavailable'),
} = {}) {
  const store = new SnapshotStore(snapshot, clock);
  const assets = path.join(frontend, 'assets');
  return http.createServer(async (request, response) => {
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
    if (!['GET', 'HEAD'].includes(request.method)) return send(405, 'Method not allowed', { Allow: 'GET, HEAD' });
    if (pathname === '/healthz') return json(200, { status: 'ok' });
    if (pathname === '/api/tenders' || pathname === '/readyz') {
      const accept = request.headers['accept-encoding'] || '';
      const compressed = pathname === '/api/tenders' && quality(accept, 'gzip') > 0;
      if (pathname === '/api/tenders' && !compressed && quality(accept, 'identity') === 0) return json(406, { error: 'Accept gzip or identity encoding.' });
      try {
        const representation = await store.read(compressed);
        if (pathname === '/readyz') return json(200, { status: representation.stale ? 'stale' : 'ready', stale: representation.stale });
        const headers = { ETag: representation.etag, Vary: 'Accept-Encoding', 'Cache-Control': 'public, max-age=60, must-revalidate',
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
        'Cache-Control': pathname === '/' ? 'no-cache, must-revalidate' : 'public, max-age=3600' });
    } catch { return send(404, 'Not found'); }
  });
}

module.exports = { createServer, MAX_FEED_BYTES };
