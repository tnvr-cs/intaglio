import { LOGO_ASSET_INDEX } from './config.js';
import { assetPaths } from './viz-assets.js';

let underEl = null;
let overEl = null;

export function initNavLogo() {
  underEl = document.getElementById('nav-logo-under');
  overEl = document.getElementById('nav-logo-over');
  updateNavLogo(LOGO_ASSET_INDEX);
}

export function updateNavLogo(assetIndex = LOGO_ASSET_INDEX) {
  if (!underEl || !overEl) return;
  const paths = assetPaths(assetIndex);
  underEl.src = paths.under;
  overEl.src = paths.over;
}

export function syncNavLogoForMonth() {
  updateNavLogo(LOGO_ASSET_INDEX);
}
