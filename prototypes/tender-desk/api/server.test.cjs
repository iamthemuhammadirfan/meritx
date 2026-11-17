const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { gunzipSync } = require('node:zlib');
const { createServer, MAX_FEED_BYTES } = require('./server.cjs');

let directory, filename, payload, server, port, now;
const write = () => fs.writeFile(filename, JSON.stringify(payload));

beforeEach(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'meritx-node-api-'));
  filename = path.join(directory, 'feed.json');
  now = Date.parse('2026-11-17T08:00:00Z');
  payload = { schemaVersion: 1, generatedAt: new Date(now).toISOString(),
    schedule: { time: '06:00', timezone: 'Asia/Karachi', frequency: 'daily' },
    sources: [{ key: 'federal-epads', status: 'connected' }],
    tenders: [{ id: 'EPADS-P1', title: 'Laptops in Lahore', documents: [], matches: [],
      location: { city: 'Lahore', basis: 'title' }, changes: [] }] };
  await write();
  server = createServer({ snapshot: filename, clock: () => now, logError: () => {} });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
});

afterEach(async () => {
  await new Promise(resolve => server.close(resolve));
  await fs.rm(directory, { recursive: true, force: true });
});

function request(url = '/api/tenders', { method = 'GET', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: url, method, headers, agent: false }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers,
        body: Buffer.concat(chunks), json() { return JSON.parse(this.body); } }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

test('public projection excludes future private root, tender and nested fields', async () => {
  payload.companyProfiles = [{ secret: 'private-profile' }];
  payload.tenders[0].internalNote = 'private-note';
  payload.tenders[0].location.privateSiteCode = 'private-site';
  payload.tenders[0].documents = [{ label: 'Document', url: 'https://epads.gov.pk/doc', privateToken: 'private-token' }];
  await write();
  const response = await request();
  assert.equal(response.status, 200);
  assert.equal(response.body.includes('private-'), false);
  assert.equal(response.json().tenders[0].title, 'Laptops in Lahore');
  assert.equal(response.json().stale, false);
});

test('gzip and identity share a weak semantic validator and have correct wire lengths', async () => {
  const gzip = await request('/api/tenders', { headers: { 'Accept-Encoding': 'gzip' } });
  const identity = await request();
  assert.equal(gzip.headers['content-encoding'], 'gzip');
  assert.equal(identity.headers['content-encoding'], undefined);
  assert.deepEqual(JSON.parse(gunzipSync(gzip.body)), identity.json());
  assert.equal(gzip.headers.etag, identity.headers.etag);
  assert.match(identity.headers.etag, /^W\/"[a-f0-9]{64}"$/);
  assert.equal(gzip.headers.vary, 'Accept-Encoding');
  assert.equal(Number(gzip.headers['content-length']), gzip.body.length);
  assert.equal(Number(identity.headers['content-length']), identity.body.length);
});

test('encoding negotiation honors zero quality and unacceptable representations', async () => {
  const identity = await request('/api/tenders', { headers: { 'Accept-Encoding': 'gzip;q=0' } });
  assert.equal(identity.headers['content-encoding'], undefined);
  const rejected = await request('/api/tenders', { headers: { 'Accept-Encoding': 'gzip;q=0, identity;q=0' } });
  assert.equal(rejected.status, 406);
});

test('HEAD and conditional GET have no body across equivalent compressed responses', async () => {
  const get = await request();
  const head = await request('/api/tenders', { method: 'HEAD' });
  assert.equal(head.body.length, 0);
  assert.equal(head.headers['content-length'], get.headers['content-length']);
  const unchanged = await request('/api/tenders', { headers: { 'If-None-Match': get.headers.etag.replace(/^W\//, '') } });
  assert.equal(unchanged.status, 304);
  assert.equal(unchanged.body.length, 0);
  const changedEncoding = await request('/api/tenders', { headers: { 'Accept-Encoding': 'gzip', 'If-None-Match': get.headers.etag } });
  assert.equal(changedEncoding.status, 304);
  assert.equal(changedEncoding.body.length, 0);
});

test('atomic replacement invalidates cache with the same file size and timestamp', async () => {
  const first = await request();
  const stat = await fs.stat(filename);
  payload.tenders[0].title = 'Laptops in Multan';
  const replacement = filename + '.tmp';
  await fs.writeFile(replacement, JSON.stringify(payload));
  await fs.utimes(replacement, stat.atime, stat.mtime);
  await fs.rename(replacement, filename);
  const second = await request();
  assert.equal(second.json().tenders[0].title, 'Laptops in Multan');
  assert.notEqual(second.headers.etag, first.headers.etag);
});

test('stale transition updates cached data without a file write', async () => {
  const first = await request();
  now += 37 * 3600 * 1000;
  const later = await request();
  assert.equal(later.json().stale, true);
  assert.notEqual(later.headers.etag, first.headers.etag);
  assert.equal((await request('/readyz')).json().status, 'stale');
});

test('missing, corrupt, oversized, malformed and timezone-free feeds fail without path leaks', async () => {
  for (const mode of ['missing', 'corrupt', 'oversized', 'schema', 'timezone', 'nested']) {
    await write();
    if (mode === 'missing') await fs.unlink(filename);
    if (mode === 'corrupt') await fs.writeFile(filename, '{invalid');
    if (mode === 'oversized') await fs.truncate(filename, MAX_FEED_BYTES + 1);
    if (mode === 'schema') await fs.writeFile(filename, '{"schemaVersion":2}');
    if (mode === 'timezone') await fs.writeFile(filename, JSON.stringify({ ...payload, generatedAt: '2026-11-17T08:00:00' }));
    if (mode === 'nested') await fs.writeFile(filename, JSON.stringify({ ...payload, tenders: [{ matches: {} }] }));
    const response = await request();
    assert.equal(response.status, 503, mode);
    assert.equal(response.body.includes(directory), false);
    assert.equal(response.headers['retry-after'], '300');
    assert.equal((await request('/healthz')).status, 200);
  }
});

test('only public files are served, and writes and untrusted hosts are rejected', async () => {
  assert.equal((await request('/')).status, 200);
  assert.equal((await request('/assets/dashboard.js')).status, 200);
  for (const url of ['/api/server.cjs', '/app.cjs', '/engine/collector.py', '/api/tenders.php', '/README.md', '/package.json', '/tenders/',
    '/assets/../engine/collector.py', '/assets/%2e%2e/api/server.cjs', '/assets/.env']) {
    assert.equal((await request(url)).status, 404, url);
  }
  assert.equal((await request('/api/tenders', { method: 'POST' })).status, 405);
  assert.equal((await request('/api/tenders', { headers: { Host: 'unapproved.invalid' } })).status, 400);
  assert.equal((await request()).headers['x-robots-tag'], 'noindex, nofollow, noarchive');
});

test('an asset symlink cannot serve files from outside the assets directory', async () => {
  const frontend = path.join(directory, 'frontend');
  await fs.mkdir(path.join(frontend, 'assets'), { recursive: true });
  await fs.writeFile(path.join(directory, 'private.txt'), 'private-secret');
  await fs.symlink(path.join(directory, 'private.txt'), path.join(frontend, 'assets', 'leak.txt'));
  await new Promise(resolve => server.close(resolve));
  server = createServer({ snapshot: filename, frontend, logError: () => {} });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
  assert.equal((await request('/assets/leak.txt')).status, 404);
});

test('concurrent requests share a consistent snapshot and refresh after atomic publication', async () => {
  const responses = await Promise.all(Array.from({ length: 12 }, () => request()));
  assert.equal(new Set(responses.map(response => response.headers.etag)).size, 1);
  payload.tenders[0].title = 'New publication';
  await fs.writeFile(filename + '.tmp', JSON.stringify(payload));
  await fs.rename(filename + '.tmp', filename);
  const updated = await Promise.all(Array.from({ length: 12 }, () => request()));
  assert.ok(updated.every(response => response.json().tenders[0].title === 'New publication'));
});
