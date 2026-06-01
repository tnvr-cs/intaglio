import { MONTH_NAMES, CATEGORIES, categoryIconHtml } from './config.js';
import {
  saveMonthData,
  completeOnboarding,
  setOnboardingActive,
  getEmptyMonthData,
  getMonthData,
  fillRemainingMonthsAsZero,
} from './data.js';
import { currentUser } from './state.js';
import { goTo } from './navigation.js';
import { launchApp } from './app.js';
import { showToast } from './toast.js';

let stepIndex = 0;
let monthSteps = [];

function getOnboardingMonths() {
  const now = new Date();
  const end = now.getMonth();
  const year = now.getFullYear();
  return Array.from({ length: end + 1 }, (_, month) => ({
    month,
    year,
    label: MONTH_NAMES[month],
  }));
}

function readFormData() {
  return CATEGORIES.map((cat, i) => ({
    name: cat.name,
    val: parseFloat(document.getElementById(`ob-dcc-${i}`)?.value) || 0,
    max: cat.max,
  }));
}

function updateLiveTotal() {
  const data = readFormData();
  const total = data.reduce((s, d) => s + d.val, 0);
  const el = document.getElementById('onboarding-total-val');
  if (el) el.textContent = `£${total.toLocaleString()}`;
}

function bindFormInputs() {
  document.querySelectorAll('[data-ob-sync]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const i = Number(inp.dataset.obSync);
      if (inp.dataset.obType === 'slider') {
        const num = document.getElementById(`ob-dcc-${i}`);
        if (num) num.value = inp.value;
      } else {
        const sl = document.getElementById(`ob-dccs-${i}`);
        if (sl) sl.value = Math.min(parseFloat(inp.value) || 0, CATEGORIES[i].max);
      }
      updateLiveTotal();
    });
  });
}

function renderMonthStep() {
  const step = monthSteps[stepIndex];
  const progress = ((stepIndex + 1) / monthSteps.length) * 100;
  const container = document.getElementById('onboarding-content');

  container.innerHTML = `
    <div class="onboarding-step">
      <div class="onboarding-month-badge">${step.label} ${step.year}</div>
      <div class="onboarding-grid" id="onboarding-grid"></div>
      <div class="onboarding-total">
        <span>Month total</span>
        <strong id="onboarding-total-val">£0</strong>
      </div>
      <div class="onboarding-actions">
        <button type="button" class="btn-ghost btn-ghost--muted" id="btn-ob-back"${stepIndex === 0 ? ' disabled style="opacity:0.35;pointer-events:none"' : ''}>Back</button>
        <button type="button" class="btn-ghost" id="btn-ob-skip">Skip month</button>
        <button type="button" class="btn-primary" id="btn-ob-continue">
          ${stepIndex === monthSteps.length - 1 ? 'Done' : 'Next'}
        </button>
      </div>
    </div>
  `;

  const saved = getMonthData(currentUser.uid, step.month);
  const grid = document.getElementById('onboarding-grid');
  grid.innerHTML = CATEGORIES.map((cat, i) => {
    const val = saved[i] ? saved[i].val : 0;
    const sl = Math.min(val, cat.max);
    return `<div class="data-cat-card">
      <div class="dcc-top">
        <div class="dcc-icon" style="background:${cat.color}22;">${categoryIconHtml(cat)}</div>
        <div class="dcc-name">${cat.name}</div>
      </div>
      <div class="dcc-input-wrap">
        <span class="dcc-prefix">£</span>
        <input class="dcc-input" id="ob-dcc-${i}" type="number" min="0" max="${cat.max * 2}" value="${val}"
          placeholder="0" data-ob-sync="${i}" data-ob-type="input">
      </div>
      <input class="dcc-slider" id="ob-dccs-${i}" type="range" min="0" max="${cat.max}" step="1" value="${sl}"
        data-ob-sync="${i}" data-ob-type="slider">
      <div class="dcc-hint">~£${cat.max} usual</div>
    </div>`;
  }).join('');

  document.getElementById('onboarding-progress-label').textContent =
    `Step ${stepIndex + 1} of ${monthSteps.length}`;
  document.getElementById('onboarding-progress-fill').style.width = `${progress}%`;
  document.getElementById('onboarding-step-title').textContent = step.label;
  document.getElementById('onboarding-step-desc').textContent =
    `${step.label}: try your best to guess the numbers.`;

  bindFormInputs();
  updateLiveTotal();

  document.getElementById('btn-ob-back')?.addEventListener('click', goBack);
  document.getElementById('btn-ob-skip')?.addEventListener('click', () => saveAndAdvance(getEmptyMonthData()));
  document.getElementById('btn-ob-continue')?.addEventListener('click', () => saveAndAdvance(readFormData()));
}

function renderCompleteStep() {
  const container = document.getElementById('onboarding-content');
  document.getElementById('onboarding-progress-fill').style.width = '100%';
  document.getElementById('onboarding-progress-label').textContent = 'Complete';
  document.getElementById('onboarding-step-title').textContent = 'Done';
  document.getElementById('onboarding-step-desc').textContent = '';

  container.innerHTML = `
    <div class="onboarding-step onboarding-complete">
      <div class="onboarding-complete-icon">✓</div>
      <h2>That's it</h2>
      <p>${monthSteps.length} month${monthSteps.length === 1 ? '' : 's'} saved. Tweak anything later under Data.</p>
      <button type="button" class="btn-primary btn-primary--narrow" id="btn-ob-finish">Open app</button>
    </div>
  `;

  document.getElementById('btn-ob-finish')?.addEventListener('click', finishOnboarding);
}

function renderStep() {
  if (stepIndex < monthSteps.length) {
    renderMonthStep();
  } else {
    renderCompleteStep();
  }
}

async function saveAndAdvance(data) {
  const step = monthSteps[stepIndex];
  await saveMonthData(currentUser.uid, step.month, data);
  stepIndex++;
  if (stepIndex <= monthSteps.length) {
    renderStep();
  }
}

function goBack() {
  if (stepIndex > 0) {
    stepIndex--;
    renderStep();
  }
}

async function finishOnboarding() {
  await fillRemainingMonthsAsZero();
  await completeOnboarding();
  setOnboardingActive(false);
  showToast('Setup done');
  await launchApp();
}

export function startOnboarding() {
  setOnboardingActive(true);
  monthSteps = getOnboardingMonths();
  stepIndex = 0;

  // Brand new user in January — still give them one step.
  if (!monthSteps.length) {
    monthSteps = [{ month: new Date().getMonth(), year: new Date().getFullYear(), label: MONTH_NAMES[new Date().getMonth()] }];
  }

  goTo('onboarding');
  renderStep();
}
