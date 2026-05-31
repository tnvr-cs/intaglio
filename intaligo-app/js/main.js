import { initNativeShell } from './native.js';
import {
  loadSession,
  loadUserDataFromServer,
  loadOfflineUserData,
  needsOnboarding,
  resetDataState,
  isOfflineUser,
} from './data.js';
import { startOnboarding } from './onboarding.js';
import { launchApp } from './app.js';
import { initSplash, initAuth } from './auth.js';
import { initAppNav } from './app.js';
import { initDashboard } from './dashboard.js';
import { initDataEntry } from './data-entry.js';
import { initHistory } from './history.js';
import { initStatementScanner } from './statement-scanner.js';
import { loadCategoryModel } from './category-classifier.js';

function init() {
  initNativeShell();
  loadCategoryModel();
  initSplash();
  initAuth();
  initAppNav();
  initDashboard();
  initDataEntry();
  initHistory();
  initStatementScanner();

  if (loadSession()) {
    loadSessionAndLaunch();
  }
}

async function loadSessionAndLaunch() {
  const { currentUser } = await import('./state.js');
  resetDataState();
  if (isOfflineUser()) {
    await loadOfflineUserData();
    if (needsOnboarding()) {
      startOnboarding();
      return;
    }
  } else if (currentUser?.uid && currentUser.uid !== 'demo') {
    await loadUserDataFromServer(currentUser.email);
    if (needsOnboarding()) {
      startOnboarding();
      return;
    }
  }
  launchApp();
}

document.addEventListener('DOMContentLoaded', init);
