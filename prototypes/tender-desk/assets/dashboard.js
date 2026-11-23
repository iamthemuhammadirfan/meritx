(async () => {
  'use strict';
  const root = document.getElementById('meritx-desk');
  const $ = selector => root.querySelector(selector);
  function tenderFromHash() {
    const id = new URLSearchParams(location.hash.slice(1)).get('tender');
    return id && /^[a-z0-9_-]{1,99}$/i.test(id) ? id : null;
  }
  function redirectToLogin() {
    const id = tenderFromHash();
    location.replace(id ? `/login#tender=${encodeURIComponent(id)}` : '/login');
  }
  let session;
  try {
    const response = await fetch('/api/auth/session', { cache: 'no-store', credentials: 'same-origin' });
    if (!response.ok) { redirectToLogin(); return; }
    session = await response.json();
  } catch { root.textContent = 'Team access could not be checked. Reload this page to try again.'; return; }
  const storageKey = `meritx-tender-desk-team-v1-${session.user.id}`;
  document.getElementById('mx-team-link').hidden = session.user.role !== 'admin';
  $('#mx-account').textContent = session.user.name;
  $('#mx-avatar').textContent = session.user.name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  document.getElementById('mx-logout').addEventListener('click', async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': session.csrf }, body: '{}' });
      if (response.ok || response.status === 401) { try { localStorage.removeItem(storageKey); } catch { /* Storage may be disabled. */ } root.replaceChildren(); location.replace('/login'); }
      else announce('Sign-out failed. Try again.');
    } catch { announce('Sign-out failed. Check your connection and try again.'); }
  });
  const state = { view: 'daily', region: 'all', category: 'relevant', adsOnly: false, search: '', lahoreFirst: true, saved: [], limit: 20 };
  const views = {
    daily: ['Tender overview', 'Track federal and Punjab notices and review newspaper candidates.', 'Overview'],
    shortlist: ['Shortlist', 'Saved opportunities in this browser.', 'Shortlist'],
    closing: ['Closing soon', 'Known submission deadlines in the next seven days.', 'Closing soon'],
    changes: ['Tender changes', 'Amendments and changes observed during collection.', 'Changes'],
    sources: ['Tender sources', 'Collection status and coverage for each source.', 'Sources'],
    review: ['Newspaper review', 'Check extracted candidates against their original advertisements.', 'Newspaper review'],
    profile: ['Company profile', 'MeritX service areas and preferred coverage.', 'Company profile'],
  };
  let feed = null;
  let tenders = [];
  let loading = true;
  let error = '';
  let requestInProgress = false;
  let lastCheck = null;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  const publisherHosts = new Set(['epaper.dawn.com', 'e.dawn.com', 'e.jang.com.pk', 'www.express.com.pk', 'express.com.pk']);
  function safeSourceAddress(value) {
    try {
      const url = new URL(value);
      const trustedHost = url.hostname.endsWith('.gov.pk') || publisherHosts.has(url.hostname);
      return url.protocol === 'https:' && trustedHost && !url.username && !url.password && !url.port ? url.href : null;
    } catch { return null; }
  }
  function safeSourceLink(value) {
    const address = safeSourceAddress(value);
    return address ? `<a href="${esc(address)}" target="_blank" rel="noopener noreferrer">Open source ↗</a>` : '';
  }
  const pakistanDate = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' });
  const shortDate = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short' });
  const fullDate = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short', year: 'numeric' });
  const clock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: true });
  const dayMillis = 86400000;
  function pakistanDay(date = new Date()) {
    const p = pakistanDate.formatToParts(date);
    const part = type => p.find(item => item.type === type)?.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  }
  function dateText(value, withTime = false) {
    if (!value) return 'Not available — check source';
    const date = new Date(value.length === 10 ? `${value}T12:00:00+05:00` : value);
    if (!Number.isFinite(date.getTime())) return 'Not available — check source';
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', day: '2-digit', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: true } : {}) }).format(date) + (withTime ? ' PKT' : '');
  }
  function isOpen(tender) {
    if (!tender.listed) return false;
    if (!tender.closingAt) return true; // Unknown deadline remains visible, explicitly unverified.
    return tender.datePrecision === 'date' ? tender.closingAt >= pakistanDay() : new Date(tender.closingAt) > new Date();
  }
  function daysLeft(tender) {
    if (!tender.closingAt) return null;
    return Math.round((Date.parse(tender.closingAt.slice(0, 10)) - Date.parse(pakistanDay())) / dayMillis);
  }
  function closingSoon(tender) {
    const days = daysLeft(tender);
    return days !== null && days >= 0 && days <= 7;
  }
  function dueText(tender) {
    if (!isOpen(tender)) return tender.listed ? 'Deadline passed' : 'No longer in source listing';
    if (!tender.closingAt) return 'Deadline needs source check';
    const days = daysLeft(tender);
    return `Closes ${dateText(tender.closingAt).replace(/ \d{4}$/, '')}${days === 0 ? ' · today' : days === 1 ? ' · tomorrow' : ''}`;
  }
  function fresh(tender) { return tender.firstSeenAt?.slice(0, 10) === pakistanDay(); }
  function changed(tender) { return tender.amendmentFlag || tender.changes?.length > 0; }
  function matchesCategory(tender) {
    if (state.category === 'all') return true;
    if (state.category === 'relevant') return tender.matches.length > 0;
    return tender.matches.some(match => match.category === state.category);
  }
  function visibleTenders() {
    return tenders.filter(tender =>
      (state.view === 'shortlist' ? state.saved.includes(tender.id) : isOpen(tender)) &&
      (state.view !== 'closing' || closingSoon(tender)) &&
      (state.view !== 'changes' || changed(tender)) &&
      (state.view !== 'review' || tender.reviewStatus === 'needs-review') &&
      (state.region === 'all' || tender.region === state.region) && (!state.adsOnly || tender.advertisements?.length > 0) && matchesCategory(tender) &&
      `${tender.title} ${tender.buyer} ${tender.location.city} ${tender.reference || ''} ${tender.sourceName}`.toLowerCase().includes(state.search.toLowerCase())
    ).sort((a, b) => (state.lahoreFirst ? Number(b.location.city === 'Lahore') - Number(a.location.city === 'Lahore') : 0) ||
      (a.closingAt || '9999').localeCompare(b.closingAt || '9999') || a.id.localeCompare(b.id));
  }
  function persist() { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* Browser may block local persistence. */ } }
  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (!saved) return;
      if (Object.hasOwn(views, saved.view)) state.view = saved.view;
      if (['all', 'Punjab', 'Federal'].includes(saved.region)) state.region = saved.region;
      if (['all', 'relevant', 'IT equipment', 'Networking', 'CCTV', 'Software', 'IT support'].includes(saved.category)) state.category = saved.category;
      if (typeof saved.adsOnly === 'boolean') state.adsOnly = saved.adsOnly;
      if (typeof saved.search === 'string') state.search = saved.search.slice(0, 200);
      if (typeof saved.lahoreFirst === 'boolean') state.lahoreFirst = saved.lahoreFirst;
      if (Array.isArray(saved.saved)) state.saved = [...new Set(saved.saved.filter(id => typeof id === 'string' && id.length < 100))].slice(0, 1000);
    } catch { /* Ignore incompatible saved state. */ }
  }
  function announce(text) { $('#mx-announcer').textContent = text; }
  function renderSources() {
    const sources = feed?.sources || [];
    $('#mx-source-list').innerHTML = sources.map(source => `<div class="mx-source">${icon(source.edition ? 'newspaper' : 'landmark')}<div><h3>${esc(source.name)}</h3><p>${esc(source.coverage)}</p><span class="mx-status" data-health="${esc(source.status)}">${source.status === 'connected' ? 'Collected' : source.status === 'partial' ? 'Partial collection' : source.status === 'stale' ? 'Collection overdue' : source.status === 'unavailable' ? 'Unavailable' : 'Awaiting verification'} · ${Number(source.count) || 0} collected</span>${source.edition ? `<p>${esc(source.edition)} · edition date ${esc(dateText(source.publicationDate))}<br>${Number(source.pagesFetched) || 0}/${Number(source.pagesExpected) || 0} pages fetched · ${Number(source.pagesProcessed) || 0} processed · ${Number(source.reviewCount) || 0} candidates need review</p>` : ''}<p class="mx-source-time">Last success: ${source.lastSuccessAt ? dateText(source.lastSuccessAt, true) : 'Not yet'}<br>Last attempt: ${dateText(source.lastAttemptAt, true)}</p>${source.error ? `<p>${esc(source.error)}</p>` : ''}${source.detailErrors ? `<p>${Number(source.detailErrors)} document checks failed. Previous evidence remains available.</p>` : ''}${source.detailLimitReached ? '<p>Selected documents checked. Additional notices are outside the current detail-check limit.</p>' : ''}${safeSourceLink(source.url)}</div></div>`).join('');
    const pilot = feed?.pilot;
    $('#mx-pilot').hidden = !pilot;
    if (pilot) $('#mx-pilot').innerHTML = `<h3>Seven-day newspaper pilot</h3><p>${esc(dateText(pilot.startDate))} – ${esc(dateText(pilot.endDate))} · ${esc(pilot.status)} · ${Number(pilot.daysCollected) || 0}/7 days attempted</p><p>${esc(pilot.coverageNote)}</p><div class="mx-pilot-days">${pilot.days.map(day => `<div><strong>${esc(dateText(day.date))}</strong><p>${Number(day.completeEditions) || 0}/${Number(day.expectedEditions) || 0} editions fully processed · ${Number(day.partialEditions) || 0} partial · ${Number(day.unavailableEditions) || 0} unavailable<br>${Number(day.candidates) || 0} candidates · ${Number(day.pagesProcessed) || 0} pages processed</p></div>`).join('')}</div>`;
  }
  function tenderDetails(tender) {
    const { city, basis } = tender.location;
    const locationNote = basis === 'ad-text' ? ' · mentioned in ad, delivery unverified' :
      basis === 'buyer' ? ' · buyer location, delivery unverified' : basis === 'title' ? ' · from title' : '';
    const closing = tender.closingAt
      ? dateText(tender.closingAt, tender.datePrecision === 'time') + (tender.datePrecision === 'date' ? ' · time unlisted' : '')
      : 'Verify with the source';
    const facts = [
      ['Submission deadline', closing],
      ['Published', dateText(tender.publishedAt)],
      ['Location', city ? city + locationNote : 'Unlisted'],
      ['Source', tender.sourceName || 'Unlisted'],
      ['Service area', tender.matches.map(item => item.category).join(', ') || 'Other'],
      ['Last collected', dateText(tender.lastSeenAt, true)],
    ];
    const listing = safeSourceAddress(tender.sourceUrl);
    const documents = [...tender.documents, ...(tender.advertisements || [])];
    const documentLinks = new Map();
    for (const item of documents) {
      const url = safeSourceAddress(item.url);
      if (url && !documentLinks.has(url)) documentLinks.set(url, { url, label: item.label || 'Source document' });
    }
    const pitbDocument = tender.sourceKey === 'punjab-pitb' ? documentLinks.keys().next().value : null;
    const sourceUrl = pitbDocument || listing;
    const sourceLabel = tender.newspaper ? 'Open newspaper page' : pitbDocument ? 'Open original document' : tender.sourceKey === 'punjab-pitb' ? 'Open source listing' : 'Open original notice';
    if (pitbDocument && listing && listing !== pitbDocument) documentLinks.set(listing, { url: listing, label: 'Browse publisher listings' });
    documentLinks.delete(sourceUrl);
    return {
      tender, facts, dateText, saved: state.saved.includes(tender.id),
      source: sourceUrl ? { url: sourceUrl, label: sourceLabel } : null,
      links: [...documentLinks.values()],
      evidenceId: /^[a-f0-9]{64}$/.test(tender.evidenceId || '') ? tender.evidenceId : null,
    };
  }

  let openerId;
  let openerSection;
  function restoreTenderFocus() {
    const opener = openerId && openerSection?.querySelector(`[data-tender="${CSS.escape(openerId)}"]`);
    (opener || $('#mx-search')).focus({ preventScroll: true });
    openerSection = null;
  }
  function closeTender() {
    history.replaceState(history.state, '', location.pathname + location.search);
    updateTenderSheet();
  }
  function updateTenderSheet() {
    const id = tenderFromHash();
    const detailStatus = $('#mx-detail-status');
    detailStatus.hidden = true;
    if (!globalThis.renderTenderSheet) {
      if (id) {
        detailStatus.textContent = 'Tender details could not load. Reload the dashboard to try again.';
        detailStatus.hidden = false;
      }
      return;
    }
    const tender = id ? tenders.find(item => item.id === id) : null;
    if (tender) openerId = id;
    if (id && feed && !tender) {
      detailStatus.textContent = 'This tender is unavailable in the current feed.';
      detailStatus.hidden = false;
    }
    globalThis.renderTenderSheet({
      detail: tender ? tenderDetails(tender) : null,
      onClose: closeTender,
      onAfterClose: restoreTenderFocus,
      onToggleSave: toggleSave,
    });
  }
  function toggleSave(id) {
    const saved = state.saved.includes(id);
    state.saved = saved ? state.saved.filter(item => item !== id) : [...state.saved, id];
    announce(saved ? 'Removed from shortlist.' : 'Added to shortlist in this browser.');
    render();
    persist();
  }
  function renderTenderRow(tender) {
    const saved = state.saved.includes(tender.id);
    const due = daysLeft(tender);
    const location = tender.location.city || tender.region;
    const flag = tender.reviewStatus === 'needs-review' ? 'Review ad' :
      changed(tender) ? 'Amended' : tender.sourceStatus === 'unavailable' ? 'Retained notice' : '';
    return `<article class="mx-tender">
      <a class="mx-row" href="#tender=${encodeURIComponent(tender.id)}" data-tender="${esc(tender.id)}" aria-haspopup="dialog">
        <h3>${esc(tender.title)}</h3>
        <span class="mx-row-source">${esc(tender.buyer)}${tender.reference ? ` · ${esc(tender.reference)}` : ''}</span>
        ${flag || fresh(tender) ? `<span class="mx-row-flags">${flag ? `<span class="mx-flag" data-tone="warning">${esc(flag)}</span>` : ''}${fresh(tender) ? '<span class="mx-flag" data-tone="blue">Added today</span>' : ''}</span>` : ''}
      </a>
      <div class="mx-row-context"><div>${esc(tender.sourceName || tender.region)}</div>
      <span class="mx-location" data-priority="${location === 'Lahore'}">${icon('map-pin')}${esc(location)}${tender.location.basis === 'buyer' ? ' (buyer)' : ''}</span></div>
      <span class="mx-due" data-urgent="${isOpen(tender) && due !== null && due <= 7}">${esc(dueText(tender))}</span>
      <button type="button" class="mx-save-small" data-save="${esc(tender.id)}" aria-label="${saved ? 'Remove from' : 'Add to'} shortlist: ${esc(tender.title)}" aria-pressed="${saved}">${icon(saved ? 'bookmark-check' : 'bookmark')}</button>
    </article>`;
  }
  function renderOverview(upcoming) {
    const chart = $('#mx-activity-chart');
    const deadlines = $('#mx-upcoming');
    if (!feed) {
      chart.textContent = loading ? 'Loading collection activity…' : 'Collection activity is unavailable.';
      deadlines.textContent = loading ? 'Loading deadlines…' : 'Deadlines are unavailable.';
      return;
    }

    const today = Date.parse(`${pakistanDay()}T00:00:00+05:00`);
    const firstDay = today - 6 * dayMillis;
    const counts = Array(7).fill(0);
    for (const tender of tenders) {
      const index = Math.floor((Date.parse(tender.firstSeenAt) - firstDay) / dayMillis);
      if (index >= 0 && index < counts.length) counts[index] += 1;
    }
    const maximum = Math.max(1, ...counts);
    chart.innerHTML = `<ol aria-label="Notices first collected each day">${counts.map((count, index) => {
      const day = shortDate.format(firstDay + index * dayMillis);
      const percent = count === 0 ? 0 : Math.max(3, Math.round(count * 100 / maximum));
      return `<li ${index === 6 ? 'data-today="true"' : ''} aria-label="${esc(day)} · ${count} first collected">
        <div class="mx-bar-track"><div class="mx-bar" style="--bar-size:${percent}%"><span>${count.toLocaleString('en-GB')}</span></div></div><span class="mx-bar-date">${esc(day)}</span></li>`;
    }).join('')}</ol>`;
    deadlines.innerHTML = upcoming.length ? `<ul>${upcoming.slice(0, 3).map(tender => `<li>
      <a href="#tender=${encodeURIComponent(tender.id)}" data-tender="${esc(tender.id)}" aria-haspopup="dialog"><strong>${esc(tender.title)}</strong>
      <span>${esc(tender.sourceName || tender.buyer)}</span></a><span class="mx-upcoming-date">${esc(shortDate.format(new Date(tender.closingAt)))}</span></li>`).join('')}</ul>` : 'No known deadlines in the next seven days.';
  }
  function render() {
    const active = document.activeElement;
    const focusTender = active?.dataset.tender;
    const focusSave = active?.dataset.save;
    const [title, subtitle, section] = views[state.view];
    $('#mx-page-title').textContent = title;
    $('#mx-page-subtitle').textContent = subtitle;
    $('#mx-current-view').textContent = section;
    root.querySelectorAll('.mx-nav [data-view]').forEach(button => button.dataset.view === state.view ? button.setAttribute('aria-current', 'page') : button.removeAttribute('aria-current'));
    const openRelevant = tenders.filter(tender => isOpen(tender) && tender.matches.length);
    const upcoming = openRelevant.filter(closingSoon).sort((a, b) => a.closingAt.localeCompare(b.closingAt));
    const isOverview = state.view === 'daily';
    $('#mx-overview').hidden = !isOverview;
    $('#mx-open-count').textContent = loading ? '—' : openRelevant.length;
    $('#mx-saved-count').textContent = state.saved.length;
    $('#mx-changes-count').textContent = openRelevant.filter(changed).length;
    $('#mx-lahore-count').textContent = loading ? '—' : openRelevant.filter(tender => tender.location.city === 'Lahore').length;
    $('#mx-new-count').textContent = loading ? '—' : openRelevant.filter(fresh).length;
    $('#mx-closing-count').textContent = loading ? '—' : upcoming.length;
    const date = $('#mx-date');
    date.dateTime = pakistanDay();
    date.textContent = `${fullDate.format(new Date())} · PKT`;
    const degraded = feed?.sources.some(source => source.status !== 'connected') || feed?.stale;
    const badge = $('#mx-feed-badge');
    badge.textContent = loading ? 'Loading sources' : error ? 'Feed unavailable' : degraded ? 'Partial coverage' : 'Sources current';
    badge.dataset.health = error || degraded ? 'warning' : loading ? 'loading' : 'connected';
    const feedState = $('#mx-feed-state');
    feedState.hidden = loading;
    feedState.dataset.health = badge.dataset.health;
    feedState.innerHTML = error
      ? `<strong>${esc(error)}</strong><button type="button" class="mx-secondary" data-retry="true">Try again</button>`
      : feed ? `<div><strong>Feed published</strong> ${esc(dateText(feed.generatedAt, true))}${feed.stale ? ' · Official collection overdue' : ''}</div>
        ${lastCheck ? `<span class="mx-feed-check">Checked at ${esc(clock.format(lastCheck))} PKT</span>` : ''}
        <button type="button" class="mx-feed-sources" data-view="sources">View sources</button>` : '';
    const listView = !['sources', 'profile'].includes(state.view);
    $('#mx-tender-view').hidden = !listView;
    $('#mx-sources-view').hidden = state.view !== 'sources';
    $('#mx-profile-view').hidden = state.view !== 'profile';
    $('#mx-search').value = state.search;
    $('#mx-category').value = state.category;
    $('#mx-lahore-first').checked = state.lahoreFirst;
    $('#mx-ads-only').checked = state.adsOnly;
    root.querySelectorAll('[data-region]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.region === state.region)));
    $('#mx-sort-label').textContent = state.lahoreFirst ? 'Lahore first · by deadline' : 'Nearest known deadline';
    if (isOverview) renderOverview(upcoming);
    renderSources();
    if (listView) {
      const visible = visibleTenders();
      $('#mx-result-count').textContent = loading ? 'Loading opportunities…' : `${visible.length} ${visible.length === 1 ? 'opportunity' : 'opportunities'}`;
      if (visible.length) {
        const more = visible.length - state.limit;
        $('#mx-results').innerHTML = visible.slice(0, state.limit).map(renderTenderRow).join('') +
          (more > 0 ? `<button type="button" class="mx-secondary mx-more" data-more="true">Show ${Math.min(20, more)} more</button>` : '');
      } else {
        const message = loading ? 'Loading opportunities…' : error ? 'The feed could not be loaded.' :
          state.view === 'shortlist' ? 'Your shortlist is empty.' : 'No opportunities match these filters.';
        $('#mx-results').innerHTML = `<div class="mx-empty"><h3>${message}</h3>${loading || error ? '' :
          '<p>Change a filter or return to the overview.</p><button type="button" class="mx-secondary" data-reset="true">Back to overview</button>'}</div>`;
      }
    }
    if (globalThis.lucide?.createIcons) globalThis.lucide.createIcons({ attrs: { width: 16, height: 16 } });
    if (focusTender) (active.closest('#mx-upcoming') || $('#mx-results')).querySelector(`[data-tender="${CSS.escape(focusTender)}"]`)?.focus({ preventScroll: true });
    if (focusSave) $('#mx-results').querySelector(`[data-save="${CSS.escape(focusSave)}"]`)?.focus({ preventScroll: true });
    updateTenderSheet();
  }
  async function loadFeed() {
    if (requestInProgress) return;
    requestInProgress = true;
    const refresh = $('#mx-refresh');
    refresh.disabled = true;
    refresh.setAttribute('aria-busy', 'true');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch('/api/tenders', { cache: 'no-store', credentials: 'same-origin', signal: controller.signal });
      if (response.status === 401) { feed = null; tenders = []; root.replaceChildren(); redirectToLogin(); return; }
      if (!response.ok) throw new Error('The latest feed could not be loaded. Please try again.');
      const next = await response.json();
      if (next.schemaVersion !== 1 || !Array.isArray(next.tenders) || !Array.isArray(next.sources)) throw new Error('The feed format could not be read. Please try again.');
      feed = next;
      lastCheck = new Date();
      tenders = next.tenders.filter(tender => tender && typeof tender.id === 'string' && typeof tender.title === 'string' && tender.location && Array.isArray(tender.matches) && Array.isArray(tender.documents)).map(tender => ({ ...tender, changes: Array.isArray(tender.changes) ? tender.changes : [] }));
      error = '';
    } catch (failure) {
      error = feed ? 'Refresh failed. Previously loaded notices remain visible; check Sources for their collection time.' : failure.name === 'AbortError' ? 'The feed took too long to respond. Please try again.' : failure.message;
    } finally {
      clearTimeout(timeout);
      loading = false;
      requestInProgress = false;
      refresh.disabled = false;
      refresh.removeAttribute('aria-busy');
      if (root.childElementCount) render();
    }
  }
  root.addEventListener('click', event => {
    const noticeLink = event.target.closest('a[data-tender]');
    if (noticeLink) openerSection = noticeLink.closest('#mx-upcoming, #mx-results');
    const button = event.target.closest('button');
    if (!button || !root.contains(button) || !Object.keys(button.dataset).length) return;
    if (button.dataset.view) { state.adsOnly = false; state.view = button.dataset.view; state.search = ''; state.region = 'all'; state.category = ['shortlist', 'review'].includes(state.view) ? 'all' : 'relevant'; state.limit = 20; announce(''); window.scrollTo(0, 0); }
    else if (button.dataset.region) { state.region = button.dataset.region; state.limit = 20; }
    else if (button.dataset.save) { toggleSave(button.dataset.save); return; }
    else if (button.dataset.reset) { state.adsOnly = false; state.view = 'daily'; state.region = 'all'; state.category = 'relevant'; state.search = ''; state.limit = 20; }
    else if (button.dataset.more) { state.limit += 20; }
    else if (button.dataset.retry) { announce('Retrying the tender feed…'); loadFeed(); return; }
    render(); persist();
  });
  $('#mx-refresh').addEventListener('click', loadFeed);
  $('#mx-search').addEventListener('input', event => { state.search = event.target.value; state.limit = 20; render(); announce(`${visibleTenders().length} opportunities found.`); persist(); });
  $('#mx-ads-only').addEventListener('change', event => { state.adsOnly = event.target.checked; state.limit = 20; render(); persist(); });
  $('#mx-category').addEventListener('change', event => { state.category = event.target.value; state.limit = 20; render(); persist(); });
  $('#mx-lahore-first').addEventListener('change', event => { state.lahoreFirst = event.target.checked; render(); persist(); });
  window.addEventListener('hashchange', updateTenderSheet);
  window.addEventListener('storage', event => { if (event.key === storageKey) { restore(); render(); } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loadFeed(); });
  setInterval(() => { if (!document.hidden) loadFeed(); }, 300000);
  restore(); render(); loadFeed();
})();
