import { MONTH_NAMES, CATEGORIES } from './config.js';
import { getMonthData } from './data.js';
import { currentUser, p5Inst } from './state.js';
import { showToast } from './toast.js';

export function exportPNG() {
  if (!p5Inst) return;
  p5Inst.saveCanvas('intaglio-portrait', 'png');
  showToast('PNG exported ✓');
}

export function exportCSV() {
  const rows = [['Month', ...CATEGORIES.map((c) => c.name), 'Total']];
  MONTH_NAMES.forEach((mn, i) => {
    const d = getMonthData(currentUser.uid, i);
    const total = d.reduce((s, v) => s + v.val, 0);
    rows.push([mn, ...d.map((v) => v.val), total]);
  });
  const csv = rows.map((r) => r.join(',')).join('\n');
  download('intaglio-data.csv', 'text/csv', csv);
  showToast('CSV exported ✓');
}

export function exportJSON() {
  const out = {};
  MONTH_NAMES.forEach((mn, i) => {
    out[mn] = getMonthData(currentUser.uid, i);
  });
  download('intaglio-data.json', 'application/json', JSON.stringify(out, null, 2));
  showToast('JSON exported ✓');
}

function download(name, type, content) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
}
