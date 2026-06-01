import { VIZ_MIN_NORM } from './config.js';

export const ASSET_COUNT = 4;

const TRANSITION_DUR = 1.2;

const TOP_INDICES = [0, 1, 7];
const BOTTOM_INDICES = [3, 4, 5];
const SIDE_INDICES = [2, 6];

const monthAssetIndex = new Array(12).fill(0);

let displayedAssetIndex = 1;
let fromAssetIndex = 1;
let toAssetIndex = 1;
let transitionT = 1;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function dataNorm(entry) {
  const raw = entry.val / entry.max;
  return Math.max(VIZ_MIN_NORM, Math.min(1, raw));
}

function avgNormForIndices(monthData, indices) {
  if (!monthData?.length || !indices.length) return VIZ_MIN_NORM;
  let sum = 0;
  for (const i of indices) sum += dataNorm(monthData[i]);
  return sum / indices.length;
}

export function assetIndexForDataShape(monthData) {
  if (!monthData?.length) return 2;

  const norms = monthData.map(dataNorm);
  const top = avgNormForIndices(monthData, TOP_INDICES);
  const bottom = avgNormForIndices(monthData, BOTTOM_INDICES);
  const sides = avgNormForIndices(monthData, SIDE_INDICES);

  const min = Math.min(...norms);
  const max = Math.max(...norms);
  const range = max - min;
  const mean = norms.reduce((a, b) => a + b, 0) / norms.length;
  const stdDev = Math.sqrt(
    norms.reduce((s, n) => s + (n - mean) ** 2, 0) / norms.length,
  );

  // Flat month → default dress in the middle.
  if (range <= 0.12 || stdDev <= 0.06) return 2;

  const regions = [
    { idx: 1, avg: top },
    { idx: 3, avg: bottom },
    { idx: 4, avg: sides },
  ].sort((a, b) => a.avg - b.avg);

  if (regions[1].avg - regions[0].avg < 0.04 && range < 0.18) return 2;

  return regions[0].idx;
}

export function pickAssetIndexForMonth(month, monthData) {
  if (monthData) {
    const idx = assetIndexForDataShape(monthData);
    monthAssetIndex[month] = idx;
    return idx;
  }
  return monthAssetIndex[month] || 2;
}

export function getAssetIndexForMonth(month) {
  return monthAssetIndex[month] || 2;
}

export function triggerMonthTransition(month, monthData) {
  const nextIdx = pickAssetIndexForMonth(month, monthData);
  fromAssetIndex = displayedAssetIndex;
  toAssetIndex = nextIdx;
  transitionT = 0;
}

export function updateAssetForData(month, monthData) {
  const nextIdx = pickAssetIndexForMonth(month, monthData);
  if (nextIdx === displayedAssetIndex && transitionT >= 1) return;
  fromAssetIndex = displayedAssetIndex;
  toAssetIndex = nextIdx;
  transitionT = 0;
}

export function tickTransition(dt) {
  if (transitionT >= 1) return;
  transitionT = Math.min(1, transitionT + dt / TRANSITION_DUR);
  if (transitionT >= 1) displayedAssetIndex = toAssetIndex;
}

export function getSpinAngle() {
  return 0;
}

export function isTransitioning() {
  return transitionT < 1;
}

export function isSpinning() {
  return transitionT < 1;
}

export function getAssetBlend() {
  if (transitionT >= 1) {
    return {
      transitioning: false,
      current: displayedAssetIndex,
      outAlpha: 1,
      inAlpha: 0,
      outScale: 1,
      inScale: 1,
    };
  }

  const t = easeInOutCubic(transitionT);
  const cross = smoothstep(0.28, 0.72, transitionT);

  return {
    transitioning: true,
    from: fromAssetIndex,
    to: toAssetIndex,
    outAlpha: 1 - cross,
    inAlpha: cross,
    outScale: 1 - 0.04 * t,
    inScale: 0.93 + 0.07 * t,
  };
}

export function resetVizAssets(month, monthData) {
  for (let i = 0; i < 12; i++) monthAssetIndex[i] = 0;
  displayedAssetIndex = 2;
  fromAssetIndex = 2;
  toAssetIndex = 2;
  transitionT = 1;
  if (month !== undefined && monthData) {
    displayedAssetIndex = pickAssetIndexForMonth(month, monthData);
    toAssetIndex = displayedAssetIndex;
    fromAssetIndex = displayedAssetIndex;
  }
}

export function assetPaths(index) {
  return {
    under: `assets/underlayer/${index}.png`,
    over: `assets/overlayer/${index}.png`,
  };
}
