import { MONTH_NAMES, CATEGORIES, INKY_DISPLAY_URL } from './config.js';
import { getMonthData } from './data.js';
import { currentUser, p5Inst } from './state.js';
import { showToast } from './toast.js';

const PORTRAIT_FILENAME = 'intaglio-portrait.png';

export function exportPNG() {
  if (!p5Inst) return;
  p5Inst.saveCanvas('intaglio-portrait', 'png');
  showToast('PNG exported ✓');
}

function getVizCanvas() {
  if (!p5Inst) return null;
  return p5Inst.canvas?.elt ?? p5Inst.drawingContext?.canvas ?? null;
}

export function exportToInky() {
  console.log('exportToInky called');

  if (!p5Inst) {
    console.log('no p5Inst');
    showToast('Visualization not ready');
    return;
  }

  const canvas = getVizCanvas();
  console.log('canvas:', canvas);
  if (!canvas) {
    console.log('no canvas');
    showToast('Could not export image');
    return;
  }

  p5Inst.saveCanvas(PORTRAIT_FILENAME.replace(/\.png$/i, ''), 'png');

  console.log('calling toBlob...');
  canvas.toBlob(async (blob) => {
    console.log('blob:', blob);
    if (!blob) {
      showToast('Could not export image');
      return;
    }

    const formData = new FormData();
    formData.append('image', blob, PORTRAIT_FILENAME);

    console.log('fetching:', "http://192.168.0.61:5000/display");
    try {
      const res = await fetch("http://192.168.0.61:5000/display", {
        method: 'POST',
        body: formData,
      });
      console.log('response status:', res.status);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      showToast('Sent to Inky ✓');
    } catch (err) {
      console.error('Failed to send to Inky:', err);
      showToast('Inky unreachable — PNG saved locally');
    }
  }, 'image/png');
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
