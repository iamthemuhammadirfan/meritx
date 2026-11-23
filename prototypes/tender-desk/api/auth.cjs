// Single-process team access. Store outside every document root; never log tokens.
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomBytes, createHash, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const derive = promisify(scrypt);
const hash = value => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('base64url');
const SESSION_MS = 8 * 3600_000;
const INVITE_MS = 48 * 3600_000;
const WINDOW_MS = 15 * 60_000;
const SCRYPT = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
class AuthError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const reject = (status, message) => { throw new AuthError(status, message); };
const userView = user => ({ id: user.id, email: user.email, name: user.name, role: user.role, active: Boolean(user.password) && !user.disabled });
function email(value) {
  if (typeof value !== 'string' || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) reject(400, 'Enter a valid email address.');
  return value.trim().toLowerCase();
}
async function passwordHash(password) {
  if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password) > 256) reject(400, 'Use a password of at least 12 characters and at most 256 bytes.');
  const salt = randomBytes(16).toString('hex');
  return { salt, value: (await derive(password, salt, 64, SCRYPT)).toString('hex') };
}

class TeamStore {
  constructor(filename, clock = Date.now) { this.filename = filename; this.clock = clock; this.queue = Promise.resolve(); this.pending = 0; }
  async initialize() {
    await fs.mkdir(path.dirname(this.filename), { recursive: true, mode: 0o700 });
    const handle = await fs.open(this.filename, 'wx', 0o600);
    try { await handle.writeFile(JSON.stringify({ version: 1, users: [], sessions: [], invites: [], attempts: {} })); }
    finally { await handle.close(); }
  }
  async transaction(work) {
    if (this.pending >= 16) reject(429, 'Too many requests. Try again shortly.');
    this.pending++;
    const operation = this.queue.then(async () => {
      const stat = await fs.lstat(this.filename);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 2_000_000 || (stat.mode & 0o077)) throw new Error('Private team store unavailable');
      const state = JSON.parse(await fs.readFile(this.filename, 'utf8'));
      if (state.version !== 1 || !Array.isArray(state.users) || !Array.isArray(state.sessions) || !Array.isArray(state.invites) || !state.attempts) throw new Error('Invalid team store');
      const now = this.clock();
      state.sessions = state.sessions.filter(item => item.expires > now);
      state.invites = state.invites.filter(item => item.expires > now);
      for (const [key, item] of Object.entries(state.attempts)) if (item.until <= now) delete state.attempts[key];
      // Persist throttles even when authentication fails.
      let result, failure;
      try { result = await work(state, now); } catch (error) { failure = error; }
      const temporary = `${this.filename}.${randomBytes(8).toString('hex')}.tmp`;
      try {
        await fs.writeFile(temporary, JSON.stringify(state), { mode: 0o600, flag: 'wx' });
        await fs.rename(temporary, this.filename);
      } finally { await fs.rm(temporary, { force: true }); }
      if (failure) throw failure;
      return result;
    });
    this.queue = operation.catch(() => {});
    try { return await operation; } finally { this.pending--; }
  }
  throttle(state, key, now, limit = 8) {
    const id = hash(key);
    const item = state.attempts[id] ?? { count: 0, until: now + WINDOW_MS };
    if (item.count >= limit) reject(429, 'Too many attempts. Try again in 15 minutes.');
    state.attempts[id] = { ...item, count: item.count + 1 };
    return id;
  }
  session(state, user, now) {
    const secret = token(), csrf = token();
    state.sessions = state.sessions.filter(item => item.userId !== user.id).slice(-250);
    state.sessions.push({ digest: hash(secret), csrf, userId: user.id, expires: now + SESSION_MS });
    return { secret, csrf, user: userView(user) };
  }
  async login(address, password, remote) {
    return this.transaction(async (state, now) => {
      const normalized = email(address);
      this.throttle(state, `remote:${remote}`, now, 40);
      const attempt = this.throttle(state, `login:${normalized}`, now);
      const user = state.users.find(item => item.email === normalized && !item.disabled);
      const candidate = typeof password === 'string' && Buffer.byteLength(password) <= 256 ? password : '';
      const expected = user?.password;
      const actual = await derive(candidate, expected?.salt || '00000000000000000000000000000000', 64, SCRYPT);
      if (!expected || !timingSafeEqual(actual, Buffer.from(expected.value, 'hex'))) reject(401, 'Email or password is incorrect.');
      delete state.attempts[attempt];
      return this.session(state, user, now);
    });
  }
  async authenticate(secret) {
    if (typeof secret !== 'string' || !/^[\w-]{43}$/.test(secret)) return null;
    return this.transaction(state => {
      const session = state.sessions.find(item => item.digest === hash(secret));
      const user = session && state.users.find(item => item.id === session.userId && item.password && !item.disabled);
      return user ? { user: userView(user), csrf: session.csrf } : null;
    });
  }
  async logout(secret) { return this.transaction(state => { state.sessions = state.sessions.filter(item => item.digest !== hash(secret)); }); }
  async invite(address, name, role = 'member') {
    const normalized = email(address);
    if (!['admin', 'member'].includes(role)) reject(400, 'Choose a team role.');
    if (typeof name !== 'string' || !name.trim() || name.length > 100) reject(400, 'Enter a name of up to 100 characters.');
    return this.transaction((state, now) => {
      let user = state.users.find(item => item.email === normalized);
      if (user?.role === 'admin' && role !== 'admin' && state.users.filter(item => item.role === 'admin' && !item.disabled).length <= 1) reject(400, 'Keep at least one administrator.');
      if (!user) {
        if (state.users.length >= 30) reject(400, 'The pilot supports up to 30 team members.');
        user = { id: randomBytes(16).toString('hex'), email: normalized };
        state.users.push(user);
      }
      Object.assign(user, { name: name.trim(), role, password: null, disabled: false });
      state.sessions = state.sessions.filter(item => item.userId !== user.id);
      state.invites = state.invites.filter(item => item.userId !== user.id);
      const secret = token();
      state.invites.push({ digest: hash(secret), userId: user.id, expires: now + INVITE_MS });
      return { token: secret, user: userView(user), expiresAt: new Date(now + INVITE_MS).toISOString() };
    });
  }
  async activate(secret, password, remote) {
    return this.transaction(async (state, now) => {
      this.throttle(state, `activate:${remote}`, now, 12);
      const invite = typeof secret === 'string' && state.invites.find(item => item.digest === hash(secret));
      const user = invite && state.users.find(item => item.id === invite.userId && !item.disabled);
      if (!user) reject(400, 'This invitation is invalid or expired. Ask your administrator for a new link.');
      user.password = await passwordHash(password);
      state.invites = state.invites.filter(item => item.userId !== user.id);
      return this.session(state, user, now);
    });
  }
  async list() { return this.transaction(state => state.users.map(userView)); }
  async disable(id) {
    return this.transaction(state => {
      const user = state.users.find(item => item.id === id);
      if (!user) reject(404, 'Team member not found.');
      if (user.role === 'admin' && state.users.filter(item => item.role === 'admin' && !item.disabled).length <= 1) reject(400, 'Keep at least one administrator.');
      user.disabled = true;
      state.sessions = state.sessions.filter(item => item.userId !== id);
      state.invites = state.invites.filter(item => item.userId !== id);
    });
  }
}
module.exports = { TeamStore, AuthError, SESSION_MS };
