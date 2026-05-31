import { MONTH_NAMES, CATEGORIES } from './config.js';
import { getMonthData } from './data.js';
import { currentUser } from './state.js';
import { exportCSV, exportJSON } from './export.js';

export function updateHistory() {
  const body = document.getElementById('history-body');
  const rows = MONTH_NAMES.map((mn, i) => {
    const data = getMonthData(currentUser.uid, i);
    const total = data.reduce((s, d) => s + d.val, 0);
    return { month: mn, idx: i, data, total };
  });

  let html = `<table class="history-table">
    <thead><tr><th>Month</th>${CATEGORIES.map((c) => `<th>${c.name}</th>`).join('')}<th>Total</th></tr></thead>
    <tbody>`;

  rows.forEach((r) => {
    html += `<tr>
      <td>${r.month}</td>
      ${r.data.map((d) => `<td>£${d.val}</td>`).join('')}
      <td class="h-total">£${r.total.toLocaleString()}</td>
    </tr>`;
  });

  html += '</tbody></table>';
  body.innerHTML = `<div class="history-table-wrap">${html}</div>`;
}

export function initHistory() {
  document.getElementById('btn-export-csv')?.addEventListener('click', exportCSV);
  document.getElementById('btn-export-json')?.addEventListener('click', exportJSON);
}
