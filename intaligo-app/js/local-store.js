const STORE_KEY = 'intaglio_offline_v1';

export function readOfflineStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { months: {}, onboardingComplete: false, name: null };
    const data = JSON.parse(raw);
    return {
      months: data.months || {},
      onboardingComplete: data.onboardingComplete === true,
      name: data.name || null,
    };
  } catch {
    return { months: {}, onboardingComplete: false, name: null };
  }
}

export function writeOfflineStore(payload) {
  localStorage.setItem(STORE_KEY, JSON.stringify(payload));
}
