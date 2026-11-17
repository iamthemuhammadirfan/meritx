(() => {
  'use strict';
  const root = document.getElementById('meritx-desk');
  const $ = selector => root.querySelector(selector);
  const storageKey = 'meritx-tender-desk-live-v1';
  const state = { view: 'daily', region: 'all', category: 'relevant', search: '', lahoreFirst: true, selected: null, saved: [], limit: 20 };
  const views = {
    daily: ['Today’s tender brief', 'Official opportunities, with Lahore first.'],
    shortlist: ['Your shortlist', 'Saved in this browser. Team sharing comes later.'],
    closing: ['Closing soon', 'Known deadlines in the next seven days. Check the official document for the submission time.'],
    changes: ['What changed', 'Observed changes from collection history and notices flagged as corrigenda.'],
    sources: ['Your tender sources', 'See exactly what is covered and when each source last succeeded.'],
    profile: ['Company profile', 'Add your supporting details when you’re ready.'],
  };
  let feed = null;
  let tenders = [];
  let loading = true;
  let error = '';
  let requestInProgress = false;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  function safeHref(value) {
    try { const url = new URL(value); return url.protocol === 'https:' && (url.hostname.endsWith('.gov.pk') || url.hostname === 'pitb.gov.pk') && !url.username && !url.password ? esc(url.href) : '#'; } catch { return '#'; }
  }
  function pakistanDay(date = new Date()) {
    const p = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
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
    return Math.round((Date.parse(tender.closingAt.slice(0, 10)) - Date.parse(pakistanDay())) / 86400000);
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
      (state.view !== 'closing' || (daysLeft(tender) !== null && daysLeft(tender) >= 0 && daysLeft(tender) <= 7)) &&
      (state.view !== 'changes' || changed(tender)) &&
      (state.region === 'all' || tender.region === state.region) && matchesCategory(tender) &&
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
      if (typeof saved.search === 'string') state.search = saved.search.slice(0, 200);
      if (typeof saved.lahoreFirst === 'boolean') state.lahoreFirst = saved.lahoreFirst;
      if (typeof saved.selected === 'string') state.selected = saved.selected;
      if (Array.isArray(saved.saved)) state.saved = [...new Set(saved.saved.filter(id => typeof id === 'string' && id.length < 100))].slice(0, 1000);
    } catch { /* Ignore incompatible saved state. */ }
  }
  function announce(text) { $('#mx-announcer').textContent = text; }
  function renderSources() {
    const sources = feed?.sources || [];
    $('#mx-source-list').innerHTML = sources.map(source => `<div class="mx-source">${icon('landmark')}<div><h3>${esc(source.name)}</h3><p>${esc(source.coverage)}</p><span class="mx-status" data-health="${esc(source.status)}">${source.status === 'connected' ? 'Connected' : source.status === 'unavailable' ? 'Unavailable' : 'Awaiting verification'} · ${Number(source.count) || 0} collected</span><p class="mx-source-time">Last success: ${source.lastSuccessAt ? dateText(source.lastSuccessAt, true) : 'Not yet'}<br>Last attempt: ${dateText(source.lastAttemptAt, true)}</p>${source.error ? `<p>${esc(source.error)}</p>` : ''}${source.detailErrors ? `<p>${Number(source.detailErrors)} bidding documents could not be refreshed. Listing data remains available.</p>` : ''}${source.detailLimitReached ? '<p>Some documents are awaiting detail checks.</p>' : ''}<a href="${safeHref(source.url)}" target="_blank" rel="noopener noreferrer">Open official source ↗</a></div></div>`).join('') + `<div class="mx-source">${icon('newspaper')}<div><h3>Newspaper advertisements</h3><p>Planned across publishers and editions. OCR, duplicate checks and review of uncertain fields will feed the same catalog.</p><span class="mx-status">Not connected · publisher coverage to be established</span></div></div>`;
  }
  function renderDetail(tender) {
    if (!tender) return '';
    const saved = state.saved.includes(tender.id);
    const match = tender.matches[0];
    const locationLabel = tender.location.basis === 'buyer' ? `${tender.location.city} · buyer location; delivery location unverified` : `${tender.location.city}${tender.location.basis === 'title' ? ' · from title' : ''}`;
    const closing = tender.closingAt ? `${dateText(tender.closingAt, tender.datePrecision === 'time')}${tender.datePrecision === 'date' ? ' · time not listed' : ''}` : 'Not available — verify official source';
    return `<div class="mx-detail-top"><div class="mx-eyebrow">${esc(tender.reference || tender.sourceName)}</div><h2>${esc(tender.title)}</h2><p class="mx-detail-buyer">${esc(tender.buyer)}<br>${esc(locationLabel)} · ${esc(tender.region)}</p></div><div class="mx-detail-body"><div class="mx-fit"><strong>${icon('scan-line')}${match ? 'Service keyword match' : 'Browse opportunity'}</strong><p>${match ? `Title contains “${esc(match.keyword)}”, matching ${esc(match.category)}. Specifications and eligibility still need review.` : 'This notice is outside the current MeritX service keywords. Review the official scope if relevant.'}</p></div>${tender.deadlineWarning || tender.detailWarning ? `<div class="mx-notice-warning">${esc(tender.deadlineWarning || tender.detailWarning)}</div>` : ''}<dl class="mx-kv"><div><dt>Submission deadline</dt><dd>${esc(closing)}</dd></div><div><dt>Published by source</dt><dd>${esc(dateText(tender.publishedAt))}</dd></div><div><dt>Source</dt><dd>${esc(tender.sourceName)}</dd></div><div><dt>Service area</dt><dd>${esc(tender.matches.map(item => item.category).join(', ') || 'Other')}</dd></div><div><dt>Last seen in collection</dt><dd>${esc(dateText(tender.lastSeenAt, true))}</dd></div><div><dt>Estimated value / bid security</dt><dd>Check official bidding documents</dd></div></dl><div class="mx-eligibility"><h3>${icon('circle-help')}Eligibility: not assessed</h3><p>Company registrations and supporting details can be added later.</p></div><div class="mx-eligibility"><h3>Next step</h3><p>Read the official notice, confirm the submission deadline and review the required documents.</p></div><div class="mx-actions"><button type="button" class="mx-primary cursor-interaction" data-save="${esc(tender.id)}" aria-pressed="${saved}">${icon(saved ? 'bookmark-check' : 'bookmark')}${saved ? 'Remove from shortlist' : 'Add to shortlist'}</button><a class="mx-secondary" href="${safeHref(tender.sourceUrl)}" target="_blank" rel="noopener noreferrer">${icon('external-link')}Official notice</a>${tender.documents.map(doc => `<a class="mx-link" href="${safeHref(doc.url)}" target="_blank" rel="noopener noreferrer">${esc(doc.label)} ${icon('external-link')}</a>`).join('')}</div></div>${changed(tender) ? `<details class="mx-docs"><summary class="cursor-interaction">Amendments & collection history</summary>${tender.amendmentFlag ? '<p>The source labels this notice as a corrigendum or amendment. Review the original document.</p>' : ''}${tender.changes.map(change => `<p>${esc(dateText(change.recordedAt, true))}: ${Object.entries(change.fields).map(([key, value]) => `${esc(key === 'closingAt' ? 'Deadline' : key)} changed from “${esc(value.before ?? 'not listed')}” to “${esc(value.after ?? 'not listed')}”`).join('; ')}.</p>`).join('')}</details>` : ''}`;
  }
  function render() {
    const active = document.activeElement;
    const focusTender = active?.dataset.tender;
    const focusSave = active?.dataset.save;
    const inDetail = active && $('#mx-detail').contains(active);
    $('#mx-page-title').textContent = views[state.view][0];
    $('#mx-page-subtitle').textContent = views[state.view][1];
    root.querySelectorAll('[data-view]').forEach(button => button.dataset.view === state.view ? button.setAttribute('aria-current', 'page') : button.removeAttribute('aria-current'));
    const openRelevant = tenders.filter(tender => isOpen(tender) && tender.matches.length);
    $('#mx-saved-count').textContent = state.saved.length;
    $('#mx-changes-count').textContent = openRelevant.filter(changed).length;
    $('#mx-lahore-count').textContent = loading ? '—' : openRelevant.filter(tender => tender.location.city === 'Lahore').length;
    $('#mx-new-count').textContent = loading ? '—' : openRelevant.filter(fresh).length;
    $('#mx-closing-count').textContent = loading ? '—' : openRelevant.filter(tender => daysLeft(tender) !== null && daysLeft(tender) >= 0 && daysLeft(tender) <= 7).length;
    $('#mx-date').innerHTML = `<strong>${esc(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()))}</strong>${new Intl.DateTimeFormat('en', { timeZone: 'Asia/Karachi', year: 'numeric' }).format(new Date())} · Pakistan time`;
    const degraded = feed?.sources.some(source => source.status !== 'connected') || feed?.stale;
    $('#mx-feed-badge').textContent = loading ? 'Loading official notices…' : error ? 'Feed unavailable' : degraded ? 'Live notices · partial coverage' : 'Live official notices';
    $('#mx-feed-state').innerHTML = error ? `<strong>${esc(error)}</strong><button type="button" class="mx-secondary cursor-interaction" data-retry="true">Try again</button>` : loading ? 'Loading the latest collected official notices…' : `<div><strong>Feed updated: ${esc(dateText(feed.generatedAt, true))}</strong><p>${esc(feed.coverageNote)} ${feed.stale ? 'Collection is overdue; verify dates at the source.' : 'Scheduled daily at 6:00 AM Pakistan time.'}</p></div>`;
    $('#mx-feed-state').dataset.health = error || degraded ? 'warning' : 'connected';
    const listView = !['sources', 'profile'].includes(state.view);
    $('#mx-tender-view').hidden = !listView;
    $('#mx-summary').hidden = state.view !== 'daily';
    $('#mx-sources-view').hidden = state.view !== 'sources';
    $('#mx-profile-view').hidden = state.view !== 'profile';
    $('#mx-search').value = state.search;
    $('#mx-category').value = state.category;
    $('#mx-lahore-first').checked = state.lahoreFirst;
    root.querySelectorAll('[data-region]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.region === state.region)));
    $('#mx-sort-label').textContent = state.lahoreFirst ? 'Lahore → deadline' : 'Nearest known deadline';
    renderSources();
    if (listView) {
      const visible = visibleTenders();
      if (!visible.some(tender => tender.id === state.selected)) state.selected = visible[0]?.id || null;
      $('#mx-result-count').textContent = loading ? 'Loading opportunities…' : `${visible.length} ${visible.length === 1 ? 'opportunity' : 'opportunities'}`;
      $('#mx-results').innerHTML = visible.length ? visible.slice(0, state.limit).map(tender => `<article class="mx-tender" data-selected="${tender.id === state.selected}"><button type="button" class="mx-row cursor-interaction" data-tender="${esc(tender.id)}" aria-label="View ${esc(tender.title)}, ${esc(tender.location.city)}" aria-pressed="${tender.id === state.selected}"><div class="mx-row-meta"><span class="mx-location" data-priority="${tender.location.city === 'Lahore'}">${icon('map-pin')}${esc(tender.location.city)}${tender.location.basis === 'buyer' ? ' (buyer)' : ''}</span><span>· ${esc(tender.region)}</span>${fresh(tender) ? '<span class="mx-fresh">· Added today</span>' : ''}</div><h3>${esc(tender.title)}</h3><p class="mx-row-source">${esc(tender.buyer)}</p></button><div class="mx-tender-foot"><span class="mx-due" data-urgent="${daysLeft(tender) !== null && daysLeft(tender) <= 7}">${esc(dueText(tender))}</span><button type="button" class="mx-save-small cursor-interaction" data-save="${esc(tender.id)}" aria-label="${state.saved.includes(tender.id) ? 'Remove from' : 'Add to'} shortlist: ${esc(tender.title)}" aria-pressed="${state.saved.includes(tender.id)}">${icon(state.saved.includes(tender.id) ? 'bookmark-check' : 'bookmark')}${state.saved.includes(tender.id) ? 'Saved' : 'Save'}</button></div>${tender.sourceStatus !== 'connected' ? '<div class="mx-activity">Source unavailable; last collected record retained.</div>' : ''}${state.view === 'changes' && changed(tender) ? '<div class="mx-activity">Amendment or observed change. Review the official source.</div>' : ''}</article>`).join('') + (visible.length > state.limit ? `<button type="button" class="mx-secondary cursor-interaction" data-more="true">Show ${Math.min(20, visible.length - state.limit)} more · ${visible.length - state.limit} remaining</button>` : '') : `<div class="mx-empty"><h3>${loading ? 'Loading official opportunities…' : error ? 'The feed could not be loaded.' : state.view === 'shortlist' ? 'Save your first opportunity.' : 'No opportunities in this view.'}</h3><p>${loading ? 'Results appear after the latest collection is loaded.' : error ? 'Open Sources for coverage details or try again.' : state.view === 'shortlist' ? 'Save an official notice from your daily brief to keep it here.' : 'Try another source or service area, or clear the search.'}</p>${loading ? '' : `<button type="button" class="mx-secondary cursor-interaction" ${error ? 'data-retry' : 'data-reset'}="true">${error ? 'Try again' : 'Browse daily brief'}</button>`}</div>`;
      const selected = tenders.find(tender => tender.id === state.selected);
      $('#mx-detail').hidden = !selected;
      $('#mx-detail').innerHTML = renderDetail(selected);
    }
    if (globalThis.lucide?.createIcons) globalThis.lucide.createIcons({ attrs: { width: 16, height: 16 } });
    if (focusTender) root.querySelector(`[data-tender="${CSS.escape(focusTender)}"]`)?.focus({ preventScroll: true });
    if (focusSave) (inDetail ? $('#mx-detail') : $('#mx-results')).querySelector(`[data-save="${CSS.escape(focusSave)}"]`)?.focus({ preventScroll: true });
  }
  async function loadFeed() {
    if (requestInProgress) return;
    requestInProgress = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch('/api/tenders', { cache: 'no-cache', credentials: 'omit', signal: controller.signal });
      if (!response.ok) throw new Error('The latest feed could not be loaded. Please try again.');
      const next = await response.json();
      if (next.schemaVersion !== 1 || !Array.isArray(next.tenders) || !Array.isArray(next.sources)) throw new Error('The feed format could not be read. Please try again.');
      feed = next;
      tenders = next.tenders.filter(tender => tender && typeof tender.id === 'string' && typeof tender.title === 'string' && tender.location && Array.isArray(tender.matches) && Array.isArray(tender.documents)).map(tender => ({ ...tender, changes: Array.isArray(tender.changes) ? tender.changes : [] }));
      error = '';
    } catch (failure) {
      error = feed ? 'Refresh failed. Previously loaded notices remain visible; check Sources for their collection time.' : failure.name === 'AbortError' ? 'The feed took too long to respond. Please try again.' : failure.message;
    } finally {
      clearTimeout(timeout); loading = false; requestInProgress = false; render();
    }
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || !root.contains(button)) return;
    if (button.dataset.view) { state.view = button.dataset.view; state.search = ''; state.region = 'all'; state.category = state.view === 'shortlist' ? 'all' : 'relevant'; state.limit = 20; announce(''); }
    else if (button.dataset.region) { state.region = button.dataset.region; state.limit = 20; }
    else if (button.dataset.tender) { state.selected = button.dataset.tender; }
    else if (button.dataset.save) { const id = button.dataset.save; const saved = state.saved.includes(id); state.saved = saved ? state.saved.filter(item => item !== id) : [...state.saved, id]; announce(`${saved ? 'Removed from' : 'Added to'} shortlist. Saved in this browser only.`); }
    else if (button.dataset.reset) { state.view = 'daily'; state.region = 'all'; state.category = 'relevant'; state.search = ''; state.limit = 20; }
    else if (button.dataset.more) { state.limit += 20; }
    else if (button.dataset.retry) { announce('Retrying the tender feed…'); loadFeed(); return; }
    render(); persist();
    if (button.dataset.tender && window.matchMedia('(max-width:600px)').matches) $('#mx-detail').scrollIntoView({ block: 'start' });
  });
  $('#mx-search').addEventListener('input', event => { state.search = event.target.value; state.limit = 20; render(); announce(`${visibleTenders().length} opportunities found.`); persist(); });
  $('#mx-category').addEventListener('change', event => { state.category = event.target.value; state.limit = 20; render(); persist(); });
  $('#mx-lahore-first').addEventListener('change', event => { state.lahoreFirst = event.target.checked; render(); persist(); });
  window.addEventListener('storage', event => { if (event.key === storageKey) { restore(); render(); } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loadFeed(); });
  setInterval(() => { if (!document.hidden) loadFeed(); }, 300000);
  restore(); render(); loadFeed();
})();
