const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { AuthError } = require('./auth.cjs');

function tenderId(input) {
  if (typeof input.tenderId !== 'string' || !/^[a-z0-9_-]{1,99}$/i.test(input.tenderId)) {
    throw new AuthError(400, 'Select a tender from the desk.');
  }
  return input.tenderId;
}

function text(value, label, max, required = false) {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) {
    throw new AuthError(400, `Enter ${label} using up to ${max} characters.`);
  }
  return value.trim();
}

function reviewInput(input) {
  if (!Number.isSafeInteger(input.revision) || input.revision < 1) throw new AuthError(400, 'Open the review again before saving.');
  if (!['in-review', 'bid', 'hold', 'no-bid'].includes(input.decision)) throw new AuthError(400, 'Choose a bid decision.');
  if (!Array.isArray(input.requirements) || input.requirements.length > 24) throw new AuthError(400, 'A review can have up to 24 requirements.');
  return {
    decision: input.decision,
    reason: text(input.reason, 'a decision reason', 1500, input.decision !== 'in-review'),
    requirements: input.requirements.map(row => {
      if (!row || !['unverified', 'met', 'gap'].includes(row.status)) throw new AuthError(400, 'Choose a status for each requirement.');
      return {
        requirement: text(row.requirement, 'a requirement', 350, true),
        source: text(row.source, 'a document and page or clause', 200, true),
        status: row.status,
        evidence: text(row.evidence, 'MeritX evidence', 600),
        followUp: text(row.followUp, 'a follow-up', 500),
      };
    }),
  };
}

function view(row) {
  return {
    tender: JSON.parse(row.tender),
    owner: row.owner,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    revision: row.revision,
    ...JSON.parse(row.review),
  };
}

class PursuitStore {
  constructor(teamPath, clock) {
    this.directory = path.join(path.dirname(teamPath), 'pursuits');
    this.clock = clock;
  }

  database() {
    if (this.db) return this.db;
    fs.mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    const directory = fs.lstatSync(this.directory);
    if (!directory.isDirectory() || (directory.mode & 0o077)) throw new Error('Private pursuit directory unavailable');
    const filename = path.join(this.directory, 'reviews.sqlite3');
    const descriptor = fs.openSync(filename, fs.constants.O_CREAT | fs.constants.O_RDWR | fs.constants.O_NOFOLLOW, 0o600);
    try {
      const file = fs.fstatSync(descriptor);
      if (!file.isFile() || (file.mode & 0o077)) throw new Error('Private pursuit store unavailable');
    } finally { fs.closeSync(descriptor); }
    const db = new DatabaseSync(filename);
    try {
      db.exec(`PRAGMA busy_timeout = 2500;
        CREATE TABLE IF NOT EXISTS pursuits (
          id TEXT PRIMARY KEY, tender TEXT NOT NULL, owner TEXT NOT NULL,
          updated_at TEXT NOT NULL, updated_by TEXT NOT NULL,
          revision INTEGER NOT NULL DEFAULT 1, review TEXT NOT NULL
        )`);
    } catch (error) { db.close(); throw error; }
    this.db = db;
    return db;
  }

  close() {
    this.db?.close();
    this.db = undefined;
  }

  find(id) {
    const row = this.database().prepare('SELECT * FROM pursuits WHERE id = ?').get(id);
    return row && view(row);
  }

  list() {
    return this.database().prepare('SELECT * FROM pursuits ORDER BY updated_at DESC, id').all().map(view);
  }

  create(tender, user) {
    const { id, reference, title, buyer, region, sourceKey, sourceName, sourceUrl, closingAt, datePrecision,
      publishedAt, lastSeenAt, documents, advertisements, matches, location, changes, amendmentFlag, deadlineWarning, detailWarning } = tender;
    const snapshot = { id, reference, title, buyer, region, sourceKey, sourceName, sourceUrl, closingAt, datePrecision,
      publishedAt, lastSeenAt, documents, advertisements, matches, location, changes, amendmentFlag, deadlineWarning, detailWarning };
    const empty = { decision: 'in-review', reason: '', requirements: [] };
    const result = this.database().prepare(`INSERT INTO pursuits (id, tender, owner, updated_at, updated_by, review)
      VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`)
      .run(id, JSON.stringify(snapshot), user.name, new Date(this.clock()).toISOString(), user.name, JSON.stringify(empty));
    return { created: result.changes === 1, pursuit: this.find(id) };
  }

  save(id, input, user) {
    const review = reviewInput(input);
    const db = this.database();
    const row = db.prepare(`UPDATE pursuits SET review = ?, updated_at = ?, updated_by = ?, revision = revision + 1
      WHERE id = ? AND revision = ? RETURNING *`)
      .get(JSON.stringify(review), new Date(this.clock()).toISOString(), user.name, id, input.revision);
    if (row) return view(row);
    if (!this.find(id)) throw new AuthError(404, 'Pursue this tender before saving a review.');
    throw new AuthError(409, 'A teammate saved a newer review. Copy your edits before closing and reopening this review.');
  }
}

module.exports = { PursuitStore, tenderId };
