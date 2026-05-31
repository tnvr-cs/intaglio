import {
  loadUserDataFromServer,
  loadOfflineUserData,
  clearSession,
  needsOnboarding,
  isOfflineUser,
} from './data.js';
import { startOnboarding } from './onboarding.js';
import {
  currentUser,
  setCurrentUser,
  setUserDataCache,
  p5Inst,
  setP5Inst,
} from './state.js';
import { goTo, resetPaneToDashboard, switchPane } from './navigation.js';
import { buildMonthGrid, buildPaletteStrip, updateDashSidebar, resetDashboardSidebar } from './dashboard.js';
import { buildDataEntry, buildDataMonthSelect } from './data-entry.js';
import { updateHistory } from './history.js';
import { initViz } from './viz.js';
import { resetVizAssets } from './viz-assets.js';
import { initNavLogo, syncNavLogoForMonth } from './nav-logo.js';

export async function launchApp(options = {}) {
  if (isOfflineUser()) {
    await loadOfflineUserData();
    if (options.forceOnboarding || needsOnboarding()) {
      startOnboarding();
      return;
    }
  } else if (currentUser.uid !== 'demo') {
    await loadUserDataFromServer(currentUser.email);
    if (options.forceOnboarding || needsOnboarding()) {
      startOnboarding();
      return;
    }
  } else {
    setUserDataCache({});
  }

  document.body.classList.toggle('mode-offline', isOfflineUser());
  document.getElementById('nav-avatar').textContent = currentUser.name[0].toUpperCase();
  document.getElementById('nav-username').textContent = isOfflineUser()
    ? `${currentUser.name} · offline`
    : currentUser.name;

  buildMonthGrid();
  buildPaletteStrip();
  buildDataEntry();
  buildDataMonthSelect();
  goTo('app');

  setTimeout(() => {
    initViz();
    syncNavLogoForMonth();
    updateDashSidebar();
    updateHistory();
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }, 600);
}

export function doLogout() {
  document.body.classList.remove('mode-offline');
  clearSession();
  setCurrentUser(null);
  setUserDataCache({});
  if (p5Inst) {
    p5Inst.remove();
    setP5Inst(null);
  }
  resetVizAssets();
  resetDashboardSidebar();
  resetPaneToDashboard();
  goTo('auth');
}

export function initAppNav() {
  initNavLogo();
  document.querySelectorAll('[data-pane]').forEach((link) => {
    link.addEventListener('click', () => {
      switchPane(link.dataset.pane, link, (id) => {
        if (id === 'history') updateHistory();
        if (id === 'dashboard') window.dispatchEvent(new Event('resize'));
      });
    });
  });
  document.getElementById('btn-logout')?.addEventListener('click', doLogout);
}
