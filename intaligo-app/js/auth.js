import { apiUrl, requireServerConfigured } from './api.js';
import { saveSession, setUserDataMeta, resetDataState } from './data.js';
import { currentUser, setCurrentUser } from './state.js';
import { goTo } from './navigation.js';
import { launchApp } from './app.js';

export function initAuth() {
  document.querySelectorAll('[data-auth-tab]').forEach((tab) => {
    tab.addEventListener('click', () => switchAuthTab(tab.dataset.authTab, tab));
  });

  document.getElementById('btn-login')?.addEventListener('click', doLogin);
  document.getElementById('btn-register')?.addEventListener('click', doRegister);
  document.getElementById('btn-demo')?.addEventListener('click', doDemo);
  document.getElementById('btn-offline')?.addEventListener('click', doOffline);

  ['login-email', 'login-pass'].forEach((id) => {
    document.getElementById(id)?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doLogin();
    });
  });
  ['reg-name', 'reg-email', 'reg-pass'].forEach((id) => {
    document.getElementById(id)?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doRegister();
    });
  });
}

function switchAuthTab(tab, el) {
  document.querySelectorAll('.auth-tab').forEach((t) => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('auth-form-login').classList.toggle('auth-form-hidden', tab !== 'login');
  document.getElementById('auth-form-register').classList.toggle('auth-form-hidden', tab !== 'register');
  document.getElementById('auth-error').classList.remove('show');
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.add('show');
}

async function apiAuth(path, body) {
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function doLogin() {
  if (!requireServerConfigured()) {
    showAuthError('Enter your server URL below (your PC IP, port 3000).');
    return;
  }
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  if (!email || !pass) {
    showAuthError('Please fill in all fields.');
    return;
  }
  try {
    const json = await apiAuth('/api/login', { email, password: pass });
    if (!json.ok) {
      showAuthError(json.error || 'Invalid email or password.');
      return;
    }
    resetDataState();
    setCurrentUser({
      uid: btoa(json.user.email),
      email: json.user.email,
      name: json.user.name,
    });
    saveSession(currentUser);
    await launchApp();
  } catch {
    showAuthError('Server not responding — is it running?');
  }
}

async function doRegister() {
  if (!requireServerConfigured()) {
    showAuthError('Enter your server URL below (your PC IP, port 3000).');
    return;
  }
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass = document.getElementById('reg-pass').value;
  if (!name || !email || !pass) {
    showAuthError('Please fill in all fields.');
    return;
  }
  if (pass.length < 6) {
    showAuthError('Password must be at least 6 characters.');
    return;
  }
  try {
    const json = await apiAuth('/api/register', { name, email, password: pass });
    if (!json.ok) {
      showAuthError(json.error || 'Registration failed.');
      return;
    }
    resetDataState();
    setCurrentUser({
      uid: btoa(json.user.email),
      email: json.user.email,
      name: json.user.name,
    });
    setUserDataMeta({ onboardingComplete: false });
    saveSession(currentUser);
    await launchApp({ forceOnboarding: true });
  } catch {
    showAuthError('Server not responding — is it running?');
  }
}

function doDemo() {
  resetDataState();
  setCurrentUser({ uid: 'demo', email: 'demo@intaglio.app', name: 'Demo' });
  saveSession(currentUser);
  launchApp();
}

async function doOffline() {
  resetDataState();
  const name = document.getElementById('offline-name')?.value.trim() || 'You';
  setCurrentUser({
    uid: 'offline',
    email: 'offline@local',
    name,
    offline: true,
  });
  saveSession(currentUser);
  await launchApp();
}

export function initSplash() {
  document.getElementById('btn-splash-enter')?.addEventListener('click', () => goTo('auth'));
}
