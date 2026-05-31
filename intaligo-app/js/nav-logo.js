import { assetPaths, pickAssetIndexForMonth } from './viz-assets.js';
import { getMonthData } from './data.js';
import { currentUser, currentMonth } from './state.js';

let underEl = null;
let overEl = null;

export function initNavLogo() {
  underEl = document.getElementById('nav-logo-under');
  overEl = document.getElementById('nav-logo-over');
}

export function updateNavLogo(assetIndex) {
  if (!underEl || !overEl) return;
  const paths = assetPaths(assetIndex);
  underEl.src = paths.under;
  overEl.src = paths.over;
}

export function syncNavLogoForMonth(month = currentMonth) {
  if (!currentUser?.uid) return;
  const monthData = getMonthData(currentUser.uid, month);
  updateNavLogo(pickAssetIndexForMonth(month, monthData));
}
