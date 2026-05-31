import { MONTH_SHORT, CATEGORIES, categoryIconHtml } from './config.js';
import { getMonthData, saveMonthData } from './data.js';
import {
  currentUser,
  currentMonth,
  editMonth,
  p5Inst,
  setEditMonth,
} from './state.js';
import { showToast } from './toast.js';
import { updateDashSidebar } from './dashboard.js';
import { updateHistory } from './history.js';
import { setAnimTargets } from './viz.js';

export function buildDataMonthSelect() {
  const wrap = document.getElementById('data-month-select');
  wrap.innerHTML = '';
  MONTH_SHORT.forEach((m, i) => {
    const d = document.createElement('div');
    d.className = 'dm-chip' + (i === editMonth ? ' active' : '');
    d.textContent = m;
    d.onclick = () => selectEditMonth(i, d);
    wrap.appendChild(d);
  });
}

function selectEditMonth(i, el) {
  setEditMonth(i);
  document.querySelectorAll('.dm-chip').forEach((c) => c.classList.remove('active'));
  el.classList.add('active');
  buildDataEntry();
}

export function buildDataEntry() {
  const grid = document.getElementById('data-grid');
  const data = getMonthData(currentUser.uid, editMonth);
  grid.innerHTML = '';
  CATEGORIES.forEach((cat, i) => {
    const val = data[i] ? data[i].val : 0;
    grid.innerHTML += `<div class="data-cat-card">
      <div class="dcc-top">
        <div class="dcc-icon" style="background:${cat.color}22;">${categoryIconHtml(cat)}</div>
        <div class="dcc-name">${cat.name}</div>
      </div>
      <div class="dcc-input-wrap">
        <span class="dcc-prefix">£</span>
        <input class="dcc-input" id="dcc-${i}" type="number" min="0" max="${cat.max * 2}"
          value="${val}" placeholder="0"
          data-sync-slider="${i}">
      </div>
      <input class="dcc-slider" id="dccs-${i}" type="range" min="0" max="${cat.max}" step="1"
        value="${Math.min(val, cat.max)}" data-sync-input="${i}">
      <div class="dcc-hint">~£${cat.max} usual</div>
    </div>`;
  });

  grid.querySelectorAll('[data-sync-slider]').forEach((inp) => {
    inp.addEventListener('input', () => syncSlider(Number(inp.dataset.syncSlider)));
  });
  grid.querySelectorAll('[data-sync-input]').forEach((sl) => {
    sl.addEventListener('input', () => syncInput(Number(sl.dataset.syncInput)));
  });
}

function syncSlider(i) {
  const inp = document.getElementById('dcc-' + i);
  const sl = document.getElementById('dccs-' + i);
  sl.value = Math.min(parseFloat(inp.value) || 0, CATEGORIES[i].max);
}

function syncInput(i) {
  const sl = document.getElementById('dccs-' + i);
  const inp = document.getElementById('dcc-' + i);
  inp.value = sl.value;
}

export async function saveData() {
  const data = CATEGORIES.map((cat, i) => ({
    name: cat.name,
    val: parseFloat(document.getElementById('dcc-' + i).value) || 0,
    max: cat.max,
  }));
  await saveMonthData(currentUser.uid, editMonth, data);
  const conf = document.getElementById('save-confirm');
  conf.classList.add('show');
  setTimeout(() => conf.classList.remove('show'), 2500);
  showToast(`${MONTH_SHORT[editMonth]} saved ✓`);
  if (editMonth === currentMonth && p5Inst) {
    setAnimTargets(null, data);
    p5Inst.loop();
    updateDashSidebar();
  }
  updateHistory();
}

export function applyCategoryTotals(totals) {
  CATEGORIES.forEach((cat, i) => {
    const inp = document.getElementById('dcc-' + i);
    const sl = document.getElementById('dccs-' + i);
    if (!inp) return;
    const val = Math.round(totals[i] || 0);
    inp.value = val;
    if (sl) sl.value = Math.min(val, cat.max);
  });
}

export function initDataEntry() {
  document.getElementById('btn-save-data')?.addEventListener('click', saveData);
}
