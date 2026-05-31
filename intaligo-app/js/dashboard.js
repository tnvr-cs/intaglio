import { MONTH_SHORT, CATEGORIES, PALETTES, PAL_COLORS } from './config.js';
import { getMonthData } from './data.js';
import {
  currentUser,
  currentMonth,
  currentPalette,
  p5Inst,
  setCurrentMonth,
  setCurrentPalette,
  setShowMonthNeighbors,
  setHideVizLines,
} from './state.js';
import { exportPNG } from './export.js';
import { getAnimState, setAnimTargets, onVizMonthChange } from './viz.js';
import { animateValue, animateBar, pulseElement } from './counter.js';

const COUNTER_DUR = 650;
let sidebarBuilt = false;

export function buildMonthGrid() {
  const grid = document.getElementById('month-grid');
  grid.innerHTML = '';
  MONTH_SHORT.forEach((m, i) => {
    const d = document.createElement('div');
    d.className = 'month-chip' + (i === currentMonth ? ' active' : '');
    d.textContent = m;
    d.onclick = () => selectMonth(i, d);
    grid.appendChild(d);
  });
}

function selectMonth(i, el) {
  setCurrentMonth(i);
  document.querySelectorAll('.month-chip').forEach((c) => c.classList.remove('active'));
  el.classList.add('active');
  onVizMonthChange(i);
  if (p5Inst) {
    const { currentMD, animMD } = getAnimState();
    setAnimTargets(
      animMD.length ? animMD.map((d) => ({ ...d })) : getMonthData(currentUser.uid, i),
      getMonthData(currentUser.uid, i),
    );
    p5Inst.loop();
  }
  updateDashSidebar();
}

export function buildPaletteStrip() {
  const strip = document.getElementById('palette-strip');
  strip.innerHTML = '';
  PALETTES.forEach((pal, i) => {
    const d = document.createElement('div');
    d.className = 'pal-swatch' + (i === 0 ? ' active' : '');
    d.style.background = PAL_COLORS[i];
    d.title = pal.name;
    d.onclick = () => selectPalette(i, d);
    strip.appendChild(d);
  });
}

function selectPalette(i, el) {
  setCurrentPalette(i);
  document.querySelectorAll('.pal-swatch').forEach((s) => s.classList.remove('active'));
  el.classList.add('active');
  document.body.style.background = PALETTES[i].bg;
  if (p5Inst) p5Inst.redraw();
}

function ensureSidebarStructure() {
  if (sidebarBuilt) return;
  sidebarBuilt = true;

  document.getElementById('stat-cards').innerHTML = `
    <div class="stat-card">
      <span class="stat-label">Total</span>
      <span class="stat-val"><span class="counter" id="counter-total" data-value="0">£0</span></span>
    </div>
    <div class="stat-card">
      <span class="stat-label">Top Spend</span>
      <span class="stat-val stat-val--split">
        <span class="stat-top-name" id="stat-top-name">—</span>
        <span class="counter" id="counter-top" data-value="0">£0</span>
      </span>
    </div>
    <div class="stat-card">
      <span class="stat-label">Savings</span>
      <span class="stat-val stat-val--savings"><span class="counter" id="counter-savings" data-value="0">£0</span></span>
    </div>
  `;

  const list = document.getElementById('cat-list');
  list.innerHTML = CATEGORIES.map(
    (cat, i) => `<div class="cat-item" data-cat="${i}">
      <div class="cat-name">${cat.name}</div>
      <div class="cat-bar-wrap"><div class="cat-bar" id="cat-bar-${i}" style="width:0%;background:${cat.color};"></div></div>
      <div class="cat-amt"><span class="counter" id="counter-cat-${i}" data-value="0">£0</span></div>
    </div>`,
  ).join('');
}

function updateTopSpendName(name) {
  const el = document.getElementById('stat-top-name');
  if (!el || el.textContent === name) return;
  el.classList.add('stat-top-name--out');
  setTimeout(() => {
    el.textContent = name;
    el.classList.remove('stat-top-name--out');
    el.classList.add('stat-top-name--in');
    setTimeout(() => el.classList.remove('stat-top-name--in'), 280);
  }, 140);
}

export function updateDashSidebar() {
  ensureSidebarStructure();

  const data = getMonthData(currentUser.uid, currentMonth);
  const total = data.reduce((s, d) => s + d.val, 0);
  const biggest = data.reduce((a, b) => (a.val > b.val ? a : b));
  const savings = data.find((d) => d.name === 'Savings');
  const savingsVal = savings ? savings.val : 0;

  animateValue('total', document.getElementById('counter-total'), total, {
    duration: COUNTER_DUR,
    prefix: '£',
  });
  animateValue('top', document.getElementById('counter-top'), biggest.val, {
    duration: COUNTER_DUR,
    prefix: '£',
  });
  animateValue('savings', document.getElementById('counter-savings'), savingsVal, {
    duration: COUNTER_DUR,
    prefix: '£',
  });

  updateTopSpendName(biggest.name);
  pulseElement(document.getElementById('counter-total')?.closest('.stat-card'));

  data.forEach((d, i) => {
    const pct = Math.round((d.val / d.max) * 100);
    animateValue(`cat-${i}`, document.getElementById(`counter-cat-${i}`), d.val, {
      duration: COUNTER_DUR,
      prefix: '£',
    });
    animateBar(document.getElementById(`cat-bar-${i}`), pct, COUNTER_DUR);
  });
}

export function resetDashboardSidebar() {
  sidebarBuilt = false;
}

function updateCompareLegend(visible) {
  const legend = document.getElementById('viz-compare-legend');
  if (legend) legend.classList.toggle('month-overlay-legend--hidden', !visible);
}

export function initDashboard() {
  document.getElementById('btn-export-png')?.addEventListener('click', exportPNG);

  const chk = document.getElementById('chk-month-neighbors');
  chk?.addEventListener('change', () => {
    setShowMonthNeighbors(chk.checked);
    updateCompareLegend(chk.checked);
    if (p5Inst) p5Inst.redraw();
  });

  const chkLines = document.getElementById('chk-hide-viz-lines');
  chkLines?.addEventListener('change', () => {
    setHideVizLines(chkLines.checked);
    if (p5Inst) p5Inst.redraw();
  });
}
