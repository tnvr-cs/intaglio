import { MONTH_SHORT, CATEGORIES, categoryIconHtml } from './config.js';
import { editMonth } from './state.js';
import { parseStatementText, recalculateTotals } from './statement-parser.js';
import { applyCategoryTotals } from './data-entry.js';
import { showToast } from './toast.js';
import { recordCategoryFeedback } from './category-classifier.js';
import { usesNativeCamera, takeNativePhoto, pickNativePhoto } from './native-camera.js';

let mediaStream = null;
let tesseractPromise = null;
let lastParseResult = null;

function loadTesseract() {
  if (!tesseractPromise) {
    tesseractPromise = import(
      'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/+esm'
    ).then((m) => m.default);
  }
  return tesseractPromise;
}

function preprocessImage(sourceCanvas) {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');
  ctx.drawImage(sourceCanvas, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const boosted = gray < 128 ? gray * 0.7 : Math.min(255, gray * 1.25);
    const v = boosted > 140 ? 255 : boosted < 90 ? 0 : boosted;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

function setScannerStep(step) {
  document.querySelectorAll('.scan-step').forEach((el) => {
    el.classList.toggle('scan-step--active', el.dataset.scanStep === step);
  });
}

function setScannerStatus(msg) {
  for (const id of ['scan-status', 'scan-status-processing']) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
  }
}

async function startCamera() {
  if (usesNativeCamera()) return;

  const video = document.getElementById('scan-video');
  if (!video || !navigator.mediaDevices?.getUserMedia) {
    setScannerStatus('Camera unavailable — upload a photo instead');
    return;
  }
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    });
    video.srcObject = mediaStream;
    await video.play();
    setScannerStatus('Align your statement inside the frame');
  } catch (err) {
    console.warn('getUserMedia failed:', err);
    setScannerStatus('Camera unavailable — upload a photo instead');
  }
}

function setScannerNativeMode(native) {
  const modal = document.getElementById('scan-modal');
  modal?.classList.toggle('scan-modal--native', native);

  const video = document.getElementById('scan-video');
  const placeholder = document.getElementById('scan-native-placeholder');
  const captureBtn = document.getElementById('btn-scan-capture');
  const galleryBtn = document.getElementById('btn-scan-gallery');
  const fileLabel = document.querySelector('.scan-file-label--web');

  if (video) video.hidden = native;
  if (placeholder) placeholder.hidden = !native;
  if (captureBtn) captureBtn.textContent = native ? 'Take photo' : 'Capture';
  if (galleryBtn) galleryBtn.hidden = !native;
  if (fileLabel) fileLabel.hidden = native;

  if (native) {
    setScannerStatus('Tap Take photo — allow camera access if asked');
  }
}

async function loadImageSrcToCanvas(src) {
  let url = src;
  if (window.Capacitor?.convertFileSrc && src.startsWith('file://')) {
    url = window.Capacitor.convertFileSrc(src);
  }
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });
  const canvas = document.getElementById('scan-capture-canvas');
  const maxW = 1600;
  const scale = Math.min(1, maxW / img.width);
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }
  const video = document.getElementById('scan-video');
  if (video) video.srcObject = null;
}

function captureFrame() {
  const video = document.getElementById('scan-video');
  const canvas = document.getElementById('scan-capture-canvas');
  if (!video.videoWidth) {
    showToast('Camera not ready yet');
    return null;
  }
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  return canvas;
}

async function runOcr(sourceCanvas) {
  const Tesseract = await loadTesseract();
  const processed = preprocessImage(sourceCanvas);
  setScannerStep('processing');
  setScannerStatus('Reading statement…');

  const { data } = await Tesseract.recognize(processed, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && m.progress) {
        setScannerStatus(`Reading statement… ${Math.round(m.progress * 100)}%`);
      }
    },
  });

  return data.text || '';
}

function categoryOptions(selectedIdx) {
  return CATEGORIES.map(
    (cat, i) =>
      `<option value="${i}"${i === selectedIdx ? ' selected' : ''}>${cat.name}</option>`,
  ).join('');
}

function updateReviewSummary() {
  if (!lastParseResult) return;
  lastParseResult.totals = recalculateTotals(lastParseResult.transactions);
  const { transactions, totals } = lastParseResult;
  const summary = document.getElementById('scan-category-summary');

  summary.innerHTML = CATEGORIES.map((cat, i) => {
    if (!totals[i]) return '';
    return `<div class="scan-cat-row">
      <span class="scan-cat-label">${categoryIconHtml(cat, 18)} ${cat.name}</span>
      <strong>£${totals[i].toLocaleString()}</strong>
    </div>`;
  }).join('');

  const grand = totals.reduce((s, v) => s + v, 0);
  document.getElementById('scan-review-total').textContent =
    `£${grand.toLocaleString()} across ${transactions.length} items`;
}

function onTransactionCategoryChange(index, newCategoryIndex) {
  if (!lastParseResult?.transactions[index]) return;
  const t = lastParseResult.transactions[index];
  const catIdx = Number(newCategoryIndex);
  t.categoryIndex = catIdx;
  t.categoryName = CATEGORIES[catIdx].name;
  t.userCorrected = t.originalCategoryIndex !== catIdx;
  updateReviewSummary();
}

function renderReview(result) {
  lastParseResult = result;
  const { transactions } = result;
  const list = document.getElementById('scan-tx-list');

  if (!transactions.length) {
    list.innerHTML = `<p class="scan-empty">Couldn't find any lines — try another photo or type amounts in by hand.</p>`;
    document.getElementById('scan-category-summary').innerHTML = '';
    document.getElementById('btn-scan-apply').disabled = true;
    return;
  }

  document.getElementById('btn-scan-apply').disabled = false;
  list.innerHTML = transactions
    .slice(0, 40)
    .map(
      (t, i) => `<div class="scan-tx" data-tx-index="${i}">
        <select class="scan-tx-select" data-tx-index="${i}" aria-label="Category for ${escapeHtml(t.description)}">
          ${categoryOptions(t.categoryIndex)}
        </select>
        <span class="scan-tx-desc" title="${escapeHtml(t.description)}">${escapeHtml(t.description)}</span>
        <span class="scan-tx-amt">£${t.amount.toFixed(2)}</span>
      </div>`,
    )
    .join('');

  if (transactions.length > 40) {
    list.innerHTML += `<p class="scan-more">+ ${transactions.length - 40} more lines</p>`;
  }

  list.querySelectorAll('.scan-tx-select').forEach((sel) => {
    sel.addEventListener('change', () => {
      onTransactionCategoryChange(Number(sel.dataset.txIndex), sel.value);
    });
  });

  updateReviewSummary();
  const applyBtn = document.getElementById('btn-scan-apply');
  if (applyBtn) applyBtn.textContent = `Apply to ${MONTH_SHORT[editMonth]}`;
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

async function processImageCanvas(canvas) {
  try {
    const text = await runOcr(canvas);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const preview = document.getElementById('scan-preview-img');
    preview.src = dataUrl;
    preview.classList.remove('scan-preview-hidden');
    const reviewImg = document.getElementById('scan-preview-review');
    if (reviewImg) {
      reviewImg.src = dataUrl;
      reviewImg.classList.remove('scan-preview-hidden');
    }

    setScannerStatus('Sorting into categories…');
    const result = await parseStatementText(text);
    setScannerStep('review');
    setScannerStatus('');
    renderReview(result);
  } catch (err) {
    console.error(err);
    setScannerStep('capture');
    setScannerStatus('Could not read image — try again');
    showToast('Scan failed — try a clearer photo');
  }
}

async function handleCapture() {
  if (usesNativeCamera()) {
    try {
      const webPath = await takeNativePhoto();
      if (!webPath) return;
      stopCamera();
      const canvas = await loadImageSrcToCanvas(webPath);
      await processImageCanvas(canvas);
    } catch (err) {
      console.warn('native camera failed:', err);
      setScannerStatus('Could not open camera — try gallery or allow permission in Settings');
      showToast('Camera blocked — check app permissions');
    }
    return;
  }

  const canvas = captureFrame();
  if (!canvas) return;
  stopCamera();
  await processImageCanvas(canvas);
}

async function handleNativeGallery() {
  try {
    const webPath = await pickNativePhoto();
    if (!webPath) return;
    stopCamera();
    const canvas = await loadImageSrcToCanvas(webPath);
    await processImageCanvas(canvas);
  } catch (err) {
    console.warn('gallery pick failed:', err);
    showToast('Could not open gallery');
  }
}

async function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('Please choose an image file');
    return;
  }
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = async () => {
    const canvas = document.getElementById('scan-capture-canvas');
    const maxW = 1600;
    const scale = Math.min(1, maxW / img.width);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    stopCamera();
    await processImageCanvas(canvas);
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    showToast('Could not load image');
  };
  img.src = url;
}

export function openScanner() {
  const modal = document.getElementById('scan-modal');
  modal.classList.add('scan-modal--open');
  modal.setAttribute('aria-hidden', 'false');
  lastParseResult = null;
  document.getElementById('scan-preview-img').classList.add('scan-preview-hidden');
  document.getElementById('scan-preview-review')?.classList.add('scan-preview-hidden');
  document.getElementById('btn-scan-apply').disabled = true;
  document.getElementById('scan-tx-list').innerHTML = '';
  document.getElementById('scan-category-summary').innerHTML = '';
  setScannerStep('capture');
  setScannerNativeMode(usesNativeCamera());
  startCamera();
}

export function closeScanner() {
  const modal = document.getElementById('scan-modal');
  modal.classList.remove('scan-modal--open');
  modal.setAttribute('aria-hidden', 'true');
  stopCamera();
  setScannerStep('capture');
}

async function applyScan() {
  if (!lastParseResult?.transactions?.length) {
    showToast('Nothing to apply');
    return;
  }

  const corrections = lastParseResult.transactions.filter(
    (t) => t.userCorrected || t.categoryIndex !== t.originalCategoryIndex,
  );
  for (const t of corrections) {
    await recordCategoryFeedback(t.description, t.categoryIndex);
  }

  applyCategoryTotals(lastParseResult.totals);
  closeScanner();
  showToast(`${MONTH_SHORT[editMonth]} updated from scan ✓`);
}

export function initStatementScanner() {
  document.getElementById('btn-scan-statement')?.addEventListener('click', openScanner);
  document.getElementById('btn-scan-close')?.addEventListener('click', closeScanner);
  document.getElementById('btn-scan-capture')?.addEventListener('click', handleCapture);
  document.getElementById('btn-scan-retake')?.addEventListener('click', () => {
    document.getElementById('scan-preview-img').classList.add('scan-preview-hidden');
    document.getElementById('scan-preview-review')?.classList.add('scan-preview-hidden');
    lastParseResult = null;
    setScannerStep('capture');
    setScannerNativeMode(usesNativeCamera());
    startCamera();
  });
  document.getElementById('btn-scan-gallery')?.addEventListener('click', handleNativeGallery);
  document.getElementById('btn-scan-apply')?.addEventListener('click', applyScan);

  document.getElementById('scan-file-input')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) handleFile(file);
  });

  document.getElementById('scan-modal')?.addEventListener('click', (e) => {
    if (e.target.dataset.scanDismiss !== undefined) closeScanner();
  });
  document.querySelector('.scan-panel')?.addEventListener('click', (e) => e.stopPropagation());

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('scan-modal')?.classList.contains('scan-modal--open')) {
      closeScanner();
    }
  });
}
