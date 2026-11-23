const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { TeamStore } = require('./auth.cjs');
const { createServer } = require('./server.cjs');
let dir, team, server, port, now;
const origin = 'https://tenders.meritxsc.com';
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'meritx-team-'));
  now = Date.now(); team = new TeamStore(path.join(dir, 'team.json'), () => now);
  await team.initialize();
  server = createServer({ team, snapshot: path.join(dir, 'feed.json'), evidenceRoot: path.join(dir, 'evidence'), clock: () => now, logError: () => {} });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); port = server.address().port;
});
afterEach(async () => { await new Promise(resolve => server.close(resolve)); await fs.rm(dir, { recursive: true, force: true }); });
function request(url, { body, cookie, csrf, requestOrigin = origin, method = body === undefined ? 'GET' : 'POST' } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: url, method,
      headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { Origin: requestOrigin, 'Content-Type': 'application/json' }), ...(csrf ? { 'X-CSRF-Token': csrf } : {}) } }, response => {
      const chunks = []; response.on('data', chunk => chunks.push(chunk)); response.on('end', () => {
        const text = Buffer.concat(chunks).toString(); resolve({ status: response.statusCode, headers: response.headers, text, json: () => JSON.parse(text) });
      });
    }); req.on('error', reject); req.end(body === undefined ? undefined : JSON.stringify(body));
  });
}
async function account(role = 'admin') {
  const invite = await team.invite(`${role}@example.com`, role, role);
  const result = await request('/api/auth/activate', { body: { token: invite.token, password: 'a-long-test-password' } });
  assert.equal(result.status, 200);
  return { cookie: result.headers['set-cookie'][0].split(';')[0], csrf: result.json().csrf, user: result.json().user, invite };
}
test('anonymous visitors cannot read catalog, readiness, private images or team pages', async () => {
  for (const url of ['/api/tenders', '/readyz', '/api/auth/session', '/api/team', `/api/evidence/${'a'.repeat(64)}.png`]) assert.equal((await request(url)).status, 401, url);
  assert.equal((await request('/')).headers.location, '/login');
  assert.equal((await request('/team')).headers.location, '/login');
  assert.equal((await request('/login')).status, 200);
  assert.equal((await request('/healthz')).status, 200);
});
test('activation is single-use and issues a secure cookie without storing plaintext credentials', async () => {
  const user = await account();
  const replay = await request('/api/auth/activate', { body: { token: user.invite.token, password: 'a-long-test-password' } });
  assert.equal(replay.status, 400);
  const session = await request('/api/auth/session', user);
  assert.equal(session.json().user.role, 'admin');
  const stored = await fs.readFile(team.filename, 'utf8');
  assert.equal(stored.includes('a-long-test-password'), false);
  assert.equal(stored.includes(user.cookie.split('=')[1]), false);
  assert.equal(stored.includes(user.invite.token), false);
  assert.equal((await fs.stat(team.filename)).mode & 0o077, 0);
  const login = await request('/api/auth/login', { body: { email: 'admin@example.com', password: 'a-long-test-password' } });
  assert.match(login.headers['set-cookie'][0], /HttpOnly; SameSite=Strict; Max-Age=28800; Secure/);
  assert.match(login.headers['set-cookie'][0], /^__Host-/);
});
test('invitation expiry and password minimum are enforced', async () => {
  const invite = await team.invite('person@example.com', 'Person');
  assert.equal((await request('/api/auth/activate', { body: { token: invite.token, password: 'short' } })).status, 400);
  now += 49 * 3600_000;
  assert.equal((await request('/api/auth/activate', { body: { token: invite.token, password: 'a-long-test-password' } })).status, 400);
});
test('session survives process restart, expires and is revoked by logout', async () => {
  const user = await account();
  assert.ok(await new TeamStore(team.filename, () => now).authenticate(user.cookie.split('=')[1]));
  assert.equal((await request('/api/auth/logout', { ...user, body: {} })).status, 200);
  assert.equal((await request('/api/auth/session', user)).status, 401);
  const fresh = await account(); now += 9 * 3600_000;
  assert.equal((await request('/api/auth/session', fresh)).status, 401);
});
test('cross-site and CSRF-free mutations fail and members cannot manage accounts', async () => {
  const admin = await account();
  assert.equal((await request('/api/auth/logout', { cookie: admin.cookie, body: {} })).status, 403);
  assert.equal((await request('/api/auth/logout', { ...admin, requestOrigin: 'https://attacker.invalid', body: {} })).status, 403);
  assert.equal((await request('/api/auth/login', { body: { email: 'admin@example.com', password: 'a-long-test-password' }, requestOrigin: 'https://attacker.invalid' })).status, 403);
  const member = await account('member');
  assert.equal((await request('/api/team', member)).status, 403);
  assert.equal((await request('/api/team/invite', { ...member, body: { email: 'new@example.com', name: 'New', role: 'admin' } })).status, 403);
  assert.equal((await request('/api/team/disable', { ...admin, body: { id: admin.user.id } })).status, 400);
  assert.equal((await request('/api/team/invite', { ...admin, body: { email: 'admin@example.com', name: 'Self', role: 'admin' } })).status, 400);
  assert.equal((await request('/api/auth/session', admin)).status, 200);
  assert.equal((await request('/api/team/disable', { ...admin, body: { id: member.user.id } })).status, 200);
  assert.equal((await request('/api/auth/session', member)).status, 401);
});
test('password reset revokes sessions and repeated failures are throttled across restarts', async () => {
  const member = await account('member');
  await team.invite('member@example.com', 'Member');
  assert.equal((await request('/api/auth/session', member)).status, 401);
  for (let i = 0; i < 8; i++) assert.equal((await request('/api/auth/login', { body: { email: 'member@example.com', password: 'wrong' } })).status, 401);
  await assert.rejects(new TeamStore(team.filename, () => now).login('member@example.com', 'wrong', 'other'), error => error.status === 429);
  now += 16 * 60_000;
  assert.equal((await request('/api/auth/login', { body: { email: 'member@example.com', password: 'wrong' } })).status, 401);
});
test('evidence requires authentication, uses private caching and cannot follow escaping symlinks', async () => {
  const admin = await account(); const id = 'a'.repeat(64);
  await fs.mkdir(path.join(dir, 'evidence'));
  await fs.writeFile(path.join(dir, 'evidence', id + '.png'), 'image');
  const result = await request('/api/evidence/' + id + '.png', admin);
  assert.equal(result.status, 200); assert.equal(result.headers['cache-control'], 'private, no-store');
  await fs.symlink(team.filename, path.join(dir, 'evidence', 'b'.repeat(64) + '.png'));
  assert.equal((await request('/api/evidence/' + 'b'.repeat(64) + '.png', admin)).status, 404);
  assert.equal((await request('/api/evidence/%2e%2e/team.json', admin)).status, 404);
});
test('missing or broadly readable credential store fails closed', async () => {
  const admin = await account(); await fs.chmod(team.filename, 0o644);
  assert.equal((await request('/api/auth/session', admin)).status, 503);
  await fs.unlink(team.filename);
  assert.equal((await request('/api/auth/session', admin)).status, 503);
});
