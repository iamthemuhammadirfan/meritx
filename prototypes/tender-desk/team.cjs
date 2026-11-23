#!/usr/bin/env node
// Bootstrap from an account-owned terminal. No email is sent and no password is printed.
const path = require('node:path');
const os = require('node:os');
const { TeamStore } = require('./api/auth.cjs');
async function main() {
  const [command, email, ...name] = process.argv.slice(2);
  if (!['init-admin', 'invite-admin'].includes(command) || !email || !name.length) throw new Error('Usage: node team.cjs init-admin|invite-admin EMAIL NAME');
  const team = new TeamStore(process.env.MERITX_TEAM_PATH || path.join(os.homedir(), '.meritx-tender-engine/team.json'));
  if (command === 'init-admin') await team.initialize(); // Exclusive creation: never reset an existing store.
  const result = await team.invite(email, name.join(' '), 'admin');
  const origin = new URL(process.env.MERITX_PUBLIC_ORIGIN || 'https://tenders.meritxsc.com').origin;
  process.stdout.write(`Private administrator activation link (expires ${result.expiresAt}):\n${origin}/activate#${result.token}\n`);
}
main().catch(() => { console.error('Team setup failed. Check the command, private file permissions, and whether the store already exists.'); process.exitCode = 1; });
