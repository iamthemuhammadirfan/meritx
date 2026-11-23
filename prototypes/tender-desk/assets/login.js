(() => {
  'use strict';
  const activation = location.pathname === '/activate';
  const token = activation ? location.hash.slice(1) : '';
  if (location.hash) history.replaceState(null, '', location.pathname);
  const form = document.querySelector('#access-form');
  const password = document.querySelector('#password');
  const status = document.querySelector('#form-status');
  const button = document.querySelector('#sign-in');
  if (activation) {
    document.title = 'Activate account · MeritX Tender Desk';
    document.querySelector('#form-title').textContent = 'Set your password';
    document.querySelector('#form-help').textContent = 'Use at least 12 characters. Your invitation can be used once.';
    document.querySelector('#email-field').hidden = true;
    document.querySelector('#email').required = false;
    document.querySelector('#confirm-field').hidden = false;
    document.querySelector('#confirm').required = true;
    password.autocomplete = 'new-password'; password.minLength = 12;
    button.textContent = 'Activate account';
    if (!token) { status.textContent = 'Open the complete invitation link from your administrator.'; button.disabled = true; }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (activation && password.value !== document.querySelector('#confirm').value) { status.textContent = 'The passwords do not match.'; return; }
    button.disabled = true; status.textContent = 'Checking your account…';
    try {
      const response = await fetch(activation ? '/api/auth/activate' : '/api/auth/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(activation ? { token, password: password.value } : { email: document.querySelector('#email').value, password: password.value }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Sign-in failed. Try again.');
      location.replace('/');
    } catch (error) { status.textContent = error.message; button.disabled = false; }
  });
})();
