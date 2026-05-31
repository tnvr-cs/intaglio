import { apiUrl } from './api.js';
import { readOfflineStore, writeOfflineStore } from './local-store.js';
import { CATEGORIES } from './config.js';
import {
  currentUser,
  userDataCache,
  setUserDataCache,
  setCurrentUser,
} from './state.js';
import { showToast } from './toast.js';

let onboardingComplete = true;
let onboardingActive = false;

export function isOfflineUser() {
  return currentUser?.uid === 'offline';
}

export function setOnboardingActive(active) {
  onboardingActive = active;
}

export function setUserDataMeta(meta) {
  if (meta.onboardingComplete === true) {
    onboardingComplete = true;
  } else if (meta.onboardingComplete === false) {
    onboardingComplete = false;
  } else {
    const hasSavedMonths = Object.keys(userDataCache).length > 0;
    onboardingComplete = hasSavedMonths;
  }
}

export function needsOnboarding() {
  if (!currentUser || currentUser.uid === 'demo') return false;
  if (isOfflineUser()) return onboardingComplete === false;
  return onboardingComplete === false;
}

export function resetDataState() {
  setUserDataCache({});
  onboardingActive = false;
  onboardingComplete = true;
}

function persistOfflineStore() {
  if (!isOfflineUser()) return;
  writeOfflineStore({
    months: { ...userDataCache },
    onboardingComplete,
    name: currentUser?.name || 'You',
  });
}

export async function loadOfflineUserData() {
  setUserDataCache({});
  const store = readOfflineStore();
  if (store.months) setUserDataCache(store.months);
  setUserDataMeta({ onboardingComplete: store.onboardingComplete });
  if (store.name && currentUser) {
    setCurrentUser({ ...currentUser, name: store.name });
  }
}

export function getEmptyMonthData() {
  return CATEGORIES.map((c) => ({ name: c.name, val: 0, max: c.max }));
}

export async function completeOnboarding() {
  onboardingComplete = true;
  if (isOfflineUser()) {
    persistOfflineStore();
    return;
  }
  if (!currentUser || currentUser.uid === 'demo') return;
  try {
    await fetch(apiUrl('/api/onboarding/complete'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: currentUser.email }),
    });
  } catch {
    showToast('Could not save setup status');
  }
}

export function seedMonthData(uid, month) {
  const seed = (month * 137 + uid.charCodeAt(0) * 7) | 0;
  let s = seed;
  function rng() {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 4294967296;
  }
  return CATEGORIES.map((c) => ({
    name: c.name,
    val: Math.round(c.max * 0.35 + rng() * c.max * 0.5),
    max: c.max,
  }));
}

export function getMonthData(uid, month) {
  const key = String(month);
  if (userDataCache[key]) return userDataCache[key];
  if (onboardingActive || !onboardingComplete) {
    return getEmptyMonthData();
  }
  if (uid === 'demo') {
    const data = seedMonthData(uid, month);
    userDataCache[key] = data;
    return data;
  }
  return getEmptyMonthData();
}

export async function fillRemainingMonthsAsZero() {
  if (!currentUser || currentUser.uid === 'demo') return;
  const empty = getEmptyMonthData();
  const pending = [];
  for (let m = 0; m < 12; m++) {
    const key = String(m);
    if (!userDataCache[key]) {
      pending.push(saveMonthData(currentUser.uid, m, empty.map((d) => ({ ...d }))));
    }
  }
  await Promise.all(pending);
}

export async function loadUserDataFromServer(email) {
  if (isOfflineUser()) {
    await loadOfflineUserData();
    return;
  }
  setUserDataCache({});
  try {
    const res = await fetch(apiUrl('/api/data/' + encodeURIComponent(email)));
    const json = await res.json();
    if (json.ok && json.data) {
      if (json.data.months) setUserDataCache(json.data.months);
      setUserDataMeta({ onboardingComplete: json.data.onboardingComplete });
    } else {
      setUserDataMeta({ onboardingComplete: false });
    }
  } catch {
    setUserDataCache({});
    setUserDataMeta({ onboardingComplete: false });
  }
}

export async function saveMonthData(uid, month, data) {
  userDataCache[String(month)] = data;
  if (isOfflineUser()) {
    persistOfflineStore();
    return;
  }
  if (!currentUser || currentUser.uid === 'demo') return;
  try {
    await fetch(apiUrl('/api/data'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: currentUser.email, month, data }),
    });
  } catch {
    showToast('Could not save to server');
  }
}

export function loadSession() {
  const s = localStorage.getItem('intaglio_session');
  if (s) {
    setCurrentUser(JSON.parse(s));
    return true;
  }
  return false;
}

export function saveSession(u) {
  localStorage.setItem('intaglio_session', JSON.stringify(u));
}

export function clearSession() {
  localStorage.removeItem('intaglio_session');
  resetDataState();
}
