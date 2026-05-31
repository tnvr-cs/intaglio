export function isNativeApp() {
  return Boolean(window.Capacitor?.isNativePlatform?.());
}

export function getServerBase() {
  return (localStorage.getItem('intaglio_server_url') || '').replace(/\/$/, '');
}

export function setServerBase(url) {
  const trimmed = (url || '').trim().replace(/\/$/, '');
  if (trimmed) localStorage.setItem('intaglio_server_url', trimmed);
  else localStorage.removeItem('intaglio_server_url');
}

/** API paths on the PC/server; static files stay relative in the APK. */
export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!p.startsWith('/api')) return p;
  const base = getServerBase();
  return base ? `${base}${p}` : p;
}

export function requireServerConfigured() {
  if (!isNativeApp()) return true;
  return Boolean(getServerBase());
}
