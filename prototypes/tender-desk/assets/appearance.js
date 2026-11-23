(() => {
  'use strict';
  const themeKey = 'meritx-dashboard-theme';
  const themeButton = document.getElementById('mx-theme');
  function applyTheme(dark) {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    themeButton?.setAttribute('aria-pressed', String(dark));
  }
  try { applyTheme(localStorage.getItem(themeKey) === 'dark'); } catch { applyTheme(false); }
  themeButton?.addEventListener('click', () => {
    const dark = themeButton.getAttribute('aria-pressed') !== 'true';
    applyTheme(dark);
    try { localStorage.setItem(themeKey, dark ? 'dark' : 'light'); } catch { /* Storage may be disabled. */ }
  });
})();
