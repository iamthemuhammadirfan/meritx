(async () => {
  'use strict';
  const status = document.querySelector('#team-status');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  let session;
  async function call(url, body) {
    const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': session.csrf }, body: JSON.stringify(body) } : {}) });
    if (response.status === 401) { location.replace('/login'); throw new Error('Please sign in.'); }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'The request failed. Try again.');
    return result;
  }
  async function load() {
    const result = await call('/api/team');
    const memberCount = document.querySelector('#member-count');
    const count = result.users.length;
    memberCount.textContent = count;
    memberCount.setAttribute('aria-label', `${count} workspace ${count === 1 ? 'member' : 'members'}`);
    memberCount.hidden = false;
    document.querySelector('#members').innerHTML = result.users.map(user => {
      const self = user.id === session.user.id;
      const initials = user.name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
      return `<div class="member">
        <span class="member-avatar" aria-hidden="true">${esc(initials)}</span>
        <div><strong>${esc(user.name)}${self ? ' · You' : ''}</strong>
        <p>${esc(user.email)}</p><p>${user.role === 'admin' ? 'Administrator' : 'Team member'}
        <span class="member-status" data-active="${user.active}">${user.active ? 'Active' : 'Invite pending or inactive'}</span></p></div>
        ${self ? '<span></span>' : `<button class="button button--outline button--sm" type="button" data-disable="${esc(user.id)}">Disable access</button>`}
      </div>`;
    }).join('');
  }
  globalThis.lucide?.createIcons();
  try { session = await call('/api/auth/session'); await load(); } catch (error) {
    status.textContent = error.message;
    document.querySelector('#members').textContent = 'Team members could not be loaded.';
    return;
  }
  document.querySelector('#invite-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.target.querySelector('button'); button.disabled = true;
    document.querySelector('#invitation').hidden = true;
    try {
      const result = await call('/api/team/invite', Object.fromEntries(new FormData(event.target)));
      document.querySelector('#invitation-link').value = result.activationUrl;
      document.querySelector('#expires').textContent = `Expires ${new Date(result.expiresAt).toLocaleString('en-GB', { timeZone: 'Asia/Karachi' })} PKT. Share only with this team member.`;
      document.querySelector('#invitation').hidden = false;
      status.textContent = 'Invitation created. Copy the link to share it privately.';
      await load();
    } catch (error) { status.textContent = error.message; } finally { button.disabled = false; }
  });
  document.querySelector('#members').addEventListener('click', async event => {
    const button = event.target.closest('[data-disable]'); if (!button) return;
    button.disabled = true;
    try { await call('/api/team/disable', { id: button.dataset.disable }); status.textContent = 'Access disabled.'; await load(); }
    catch (error) { status.textContent = error.message; button.disabled = false; }
  });
  document.querySelector('#copy-link').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(document.querySelector('#invitation-link').value); status.textContent = 'Invitation link copied.'; }
    catch { document.querySelector('#invitation-link').select(); status.textContent = 'Select and copy the invitation link.'; }
  });
})();
