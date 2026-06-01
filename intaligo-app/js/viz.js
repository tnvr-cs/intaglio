import { CATEGORIES, PALETTES, VIZ_MIN_NORM } from './config.js';
import { getMonthData } from './data.js';
import {
  currentUser,
  currentMonth,
  currentPalette,
  p5Inst,
  setP5Inst,
  showMonthNeighbors,
  hideVizLines,
} from './state.js';
import {
  ASSET_COUNT,
  assetPaths,
  getAssetBlend,
  isSpinning,
  updateAssetForData,
  pickAssetIndexForMonth,
  resetVizAssets,
  tickTransition,
  triggerMonthTransition,
} from './viz-assets.js';

let currentMD = [];
let targetMD = [];
let animMD = [];
let animT = 1;
let isLooping = false;

const ANIM_DUR = 0.65;

export function getAnimState() {
  return { currentMD, targetMD, animMD, animT, isLooping };
}

export function setAnimTargets(fromMD, toMD) {
  if (fromMD) currentMD = fromMD;
  targetMD = toMD;
  animT = 0;
  isLooping = true;
  if (toMD?.length) {
    updateAssetForData(currentMonth, toMD);
  }
}

export function onVizMonthChange(monthIndex) {
  const monthData = getMonthData(currentUser.uid, monthIndex);
  triggerMonthTransition(monthIndex, monthData);
  if (p5Inst) p5Inst.loop();
}

export function initViz() {
  if (p5Inst) {
    p5Inst.remove();
    setP5Inst(null);
  }

  currentMD = getMonthData(currentUser.uid, currentMonth);
  resetVizAssets(currentMonth, currentMD);
  targetMD = currentMD.map((d) => ({ ...d }));
  animMD = currentMD.map((d) => ({ ...d }));
  animT = 1;

  const underImages = {};
  const overImages = {};

  function readLayout() {
    const wrap = document.getElementById('viz-canvas-wrap');
    const boxW = wrap?.clientWidth || 800;
    const boxH = wrap?.clientHeight || 900;
    const BASE_W = 800;
    const BASE_H = 900;
    const scale = Math.max(0.35, Math.min(boxW / BASE_W, boxH / BASE_H));
    const W = Math.round(BASE_W * scale);
    const H = Math.round(BASE_H * scale);

    const pad = 62 * scale;
    const titleZone = 36 * scale;
    const headerZone = 46 * scale;
    const contentW = W - pad * 2;
    const contentH = H - pad * 2 - titleZone;

    const R = Math.min(230 * scale, contentW * 0.28, contentH * 0.33);
    const labelGap = 20 * scale;

    return {
      W,
      H,
      scale,
      pad,
      titleZone,
      headerZone,
      contentW,
      contentH,
      labelGap,
      CX: W / 2,
      CY: pad + contentH * 0.48,
      R,
      overlaySize: R * 1.85,
    };
  }

  let layout = readLayout();
  let resizeTimer = null;

  new p5(function (p) {
    setP5Inst(p);
    const N = CATEGORIES.length;

    p.preload = function () {
      for (let i = 1; i <= ASSET_COUNT; i++) {
        const paths = assetPaths(i);
        underImages[i] = p.loadImage(paths.under);
        overImages[i] = p.loadImage(paths.over);
      }
    };

    function spoke(i) {
      return (i / N) * p.TWO_PI - p.HALF_PI;
    }

    // Stretch the skirt panels so it reads like fabric, not a plain pie chart.
    function dressScale(angle) {
      const vy = Math.sin(angle);
      const absVx = Math.abs(Math.cos(angle));
      const t = (vy + 1) / 2;
      const flare = t * t * t;

      const sx = 0.4 + flare * (1.08 + absVx * 0.92);

      let sy;
      if (vy < 0) sy = 0.48 + (vy + 1) * 0.2;
      else sy = 0.7 + vy * 0.54;

      return { sx, sy };
    }

    function dressXY(cx, cy, R, angle, norm) {
      const { sx, sy } = dressScale(angle);
      const rad = norm * R;
      return [cx + p.cos(angle) * rad * sx, cy + p.sin(angle) * rad * sy];
    }

    const CURVE_SEGMENTS = 12;
    const WAIST_NORM = VIZ_MIN_NORM * 0.88;

    function hexToRgb(hex) {
      const n = parseInt(hex.replace('#', ''), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    function mixRgb(a, b, t) {
      return [
        Math.round(p.lerp(a[0], b[0], t)),
        Math.round(p.lerp(a[1], b[1], t)),
        Math.round(p.lerp(a[2], b[2], t)),
      ];
    }

    function catmullRom(p0, p1, p2, p3, t) {
      const t2 = t * t;
      const t3 = t2 * t;
      return 0.5 * (
        2 * p1 +
        (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t3
      );
    }

    function buildSkirtPoints(cx, cy, R, N, getNormAt, segmentsPerSpoke = CURVE_SEGMENTS) {
      const norms = Array.from({ length: N }, (_, i) => getNormAt(i));
      const pts = [];

      for (let i = 0; i < N; i++) {
        const i0 = (i - 1 + N) % N;
        const i2 = (i + 1) % N;
        const i3 = (i + 2) % N;
        const aStart = spoke(i);
        let aEnd = spoke((i + 1) % N);
        let span = aEnd - aStart;
        if (span <= 0) span += p.TWO_PI;

        for (let s = 0; s < segmentsPerSpoke; s++) {
          const t = s / segmentsPerSpoke;
          const a = aStart + span * t;
          const norm = catmullRom(norms[i0], norms[i], norms[i2], norms[i3], t);
          pts.push(dressXY(cx, cy, R, a, norm));
        }
      }

      return pts;
    }

    function traceSkirtPath(points) {
      p.beginShape();
      for (const [x, y] of points) p.vertex(x, y);
      p.endShape(p.CLOSE);
    }

    function buildPanelBoundary(cx, cy, R, N, panelIdx, getNormAt, segments = CURVE_SEGMENTS) {
      const norms = Array.from({ length: N }, (_, j) => getNormAt(j));
      const i = panelIdx;
      const i0 = (i - 1 + N) % N;
      const i2 = (i + 1) % N;
      const i3 = (i + 2) % N;

      const aStart = spoke(i);
      let aEnd = spoke((i + 1) % N);
      let span = aEnd - aStart;
      if (span <= 0) span += p.TWO_PI;

      const hemCurve = [];
      const waistCurve = [];

      for (let s = 0; s <= segments; s++) {
        const t = s / segments;
        const a = aStart + span * t;
        const hemNorm = Math.max(VIZ_MIN_NORM, catmullRom(norms[i0], norms[i], norms[i2], norms[i3], t));
        hemCurve.push(dressXY(cx, cy, R, a, hemNorm));
        waistCurve.push(dressXY(cx, cy, R, a, WAIST_NORM));
      }

      return { hemCurve, waistCurve };
    }

    function fillPanelGradient(panel, rgb, pal) {
      const ctx = p.drawingContext;
      const [wx0, wy0] = panel.waistCurve[0];
      const last = panel.hemCurve.length - 1;
      const [hxL, hyL] = panel.hemCurve[last];
      const highlight = mixRgb(rgb, [255, 255, 255], 0.38);
      const shadow = mixRgb(rgb, pal.outer, 0.5);

      const grad = ctx.createLinearGradient(wx0, wy0, hxL, hyL);
      grad.addColorStop(0, `rgba(${highlight.join(',')}, 0.94)`);
      grad.addColorStop(0.45, `rgba(${rgb.join(',')}, 0.82)`);
      grad.addColorStop(1, `rgba(${shadow.join(',')}, 0.92)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(...panel.waistCurve[0]);
      for (let k = 1; k < panel.waistCurve.length; k++) ctx.lineTo(...panel.waistCurve[k]);
      for (let k = last; k >= 0; k--) ctx.lineTo(...panel.hemCurve[k]);
      ctx.closePath();
      ctx.fill();
    }

    function dataNorm(entry) {
      const raw = entry.val / entry.max;
      return Math.max(VIZ_MIN_NORM, Math.min(1, raw));
    }


    function wrapMonth(offset) {
      return (currentMonth + offset + 12) % 12;
    }

    function drawNeighborOutline(p, cx, cy, R, N, monthData, strokeRgb, alpha) {
      p.drawingContext.setLineDash([5, 7]);
      p.noFill();
      p.stroke(strokeRgb[0], strokeRgb[1], strokeRgb[2], alpha);
      p.strokeWeight(1.1);
      traceSkirtPath(buildSkirtPoints(cx, cy, R, N, (i) => dataNorm(monthData[i])));
      p.drawingContext.setLineDash([]);
    }

    function drawNeighborOverlays(p, cx, cy, R, N) {
      const prevMonth = wrapMonth(-1);
      const nextMonth = wrapMonth(1);
      const prevMD = getMonthData(currentUser.uid, prevMonth);
      const nextMD = getMonthData(currentUser.uid, nextMonth);
      drawNeighborOutline(p, cx, cy, R, N, prevMD, [140, 200, 255], 100);
      drawNeighborOutline(p, cx, cy, R, N, nextMD, [255, 190, 130], 100);
    }

    function drawMinimumLine(p, pal, cx, cy, R, N) {
      const ic = pal.inner;
      p.drawingContext.setLineDash([5, 4]);
      p.noFill();
      p.stroke(ic[0], ic[1], ic[2], 175);
      p.strokeWeight(1.4);
      traceSkirtPath(buildSkirtPoints(cx, cy, R, N, () => VIZ_MIN_NORM));
      p.drawingContext.setLineDash([]);
    }

    function drawAssetLayer(img, angle, alpha = 1, scale = 1) {
      if (!img || img.width === 0 || alpha <= 0.001) return;
      const aspect = img.width / img.height;
      let dw = layout.overlaySize;
      let dh = layout.overlaySize;
      if (aspect > 1) dh = layout.overlaySize / aspect;
      else dw = layout.overlaySize * aspect;
      dw *= scale;
      dh *= scale;
      p.push();
      p.translate(layout.CX, layout.CY);
      p.rotate(angle);
      p.imageMode(p.CENTER);
      p.drawingContext.globalAlpha = alpha;
      p.image(img, 0, 0, dw, dh);
      p.drawingContext.globalAlpha = 1;
      p.pop();
    }

    function drawAssetStack(index, underMap, angle, alpha, scale) {
      drawAssetLayer(underMap[index], angle, alpha, scale);
    }

    function drawAssetOverStack(index, overMap, angle, alpha, scale) {
      drawAssetLayer(overMap[index], angle, alpha, scale);
    }

    function drawOverlayLayers(blend, angle) {
      if (blend.transitioning) {
        drawAssetStack(blend.from, underImages, angle, blend.outAlpha, blend.outScale);
        drawAssetStack(blend.to, underImages, angle, blend.inAlpha, blend.inScale);
      } else {
        drawAssetStack(blend.current, underImages, angle, 1, 1);
      }
    }

    function drawOverlayLayersTop(blend, angle) {
      if (blend.transitioning) {
        drawAssetOverStack(blend.from, overImages, angle, blend.outAlpha, blend.outScale);
        drawAssetOverStack(blend.to, overImages, angle, blend.inAlpha, blend.inScale);
      } else {
        drawAssetOverStack(blend.current, overImages, angle, 1, 1);
      }
    }

    function applyLayoutResize() {
      const next = readLayout();
      if (next.W === layout.W && next.H === layout.H) return;
      layout = next;
      p.resizeCanvas(layout.W, layout.H);
      p.loop();
    }

    p.setup = function () {
      layout = readLayout();
      p.pixelDensity(Math.min(2, window.devicePixelRatio || 1));
      const cnv = p.createCanvas(layout.W, layout.H);
      cnv.parent('viz-canvas-wrap');
      p.loop();
      const onResize = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(applyLayoutResize, 120);
      };
      window.addEventListener('resize', onResize);
      if (typeof ResizeObserver !== 'undefined') {
        const wrap = document.getElementById('viz-canvas-wrap');
        if (wrap) new ResizeObserver(onResize).observe(wrap);
      }
    };

    p.draw = function () {
      const dt = Math.min(p.deltaTime, 32) / 1000;

      if (animT < 1) {
        animT = Math.min(1, animT + dt / ANIM_DUR);
        const e = 1 - Math.pow(1 - animT, 3);
        animMD = currentMD.map((d, i) => ({
          ...d,
          val: d.val + (targetMD[i].val - d.val) * e,
        }));
        if (animT >= 1) {
          animMD = targetMD.map((d) => ({ ...d }));
          currentMD = targetMD.map((d) => ({ ...d }));
        }
        isLooping = true;
      } else if (isSpinning()) {
        isLooping = true;
      } else {
        isLooping = false;
      }

      tickTransition(dt);

      const pal = PALETTES[currentPalette];
      const blend = getAssetBlend();

      p.background(pal.bg);

      drawAmbientGlow(p, pal, layout.W, layout.H);
      drawOverlayLayers(blend, 0);
      drawSkirtShadow(p, pal, layout.CX, layout.CY, layout.R);

      if (showMonthNeighbors && !hideVizLines) {
        drawNeighborOverlays(p, layout.CX, layout.CY, layout.R, N);
      }

      drawSkirtPanels(p, pal, layout.CX, layout.CY, layout.R, N);
      if (!hideVizLines) {
        drawFabricGuides(p, layout.CX, layout.CY, layout.R, N);
      }
      drawWaistband(p, pal, layout.CX, layout.CY, layout.R, N);
      drawHem(p, pal, layout.CX, layout.CY, layout.R, N);
      if (!hideVizLines) {
        drawBaseline(p, layout.CX, layout.CY, layout.R, N);
      }

      drawOverlayLayersTop(blend, 0);
      if (!hideVizLines) {
        drawMinimumLine(p, pal, layout.CX, layout.CY, layout.R, N);
      }

      drawMarkers(p, pal, layout.CX, layout.CY, layout.R, N);
      drawLabels(p, pal, layout.CX, layout.CY, layout.R, N);
      drawTitle(p, pal, layout.W, layout.H);
    };

    function drawAmbientGlow(p, pal, W, H) {
      const { CX: cx, CY: cy, R } = layout;
      const ctx = p.drawingContext;
      const grad = ctx.createRadialGradient(cx, cy - R * 0.08, R * 0.05, cx, cy + R * 0.1, R * 1.35);
      grad.addColorStop(0, pal.glow.replace(/[\d.]+\)$/, '0.14)'));
      grad.addColorStop(0.55, pal.glow.replace(/[\d.]+\)$/, '0.05)'));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    function drawSkirtShadow(p, pal, cx, cy, R) {
      p.noStroke();
      p.fill(0, 0, 0, 38);
      p.ellipse(cx, cy + R * 0.92, R * 1.55, R * 0.22);
      p.fill(pal.outer[0], pal.outer[1], pal.outer[2], 18);
      p.ellipse(cx, cy + R * 0.88, R * 1.2, R * 0.14);
    }

    function drawSkirtPanels(p, pal, cx, cy, R, N) {
      const getNorm = (i) => dataNorm(animMD[i]);

      for (let layer = 6; layer >= 1; layer--) {
        const depth = layer / 6;
        for (let i = 0; i < N; i++) {
          const panel = buildPanelBoundary(cx, cy, R, N, i, (j) => {
            const outer = getNorm(j);
            return WAIST_NORM + (outer - WAIST_NORM) * depth;
          });
          const rgb = mixRgb(hexToRgb(CATEGORIES[i].color), pal.mid, 0.18);
          p.drawingContext.globalAlpha = 0.08 + depth * 0.07;
          fillPanelGradient(panel, rgb, pal);
        }
      }
      p.drawingContext.globalAlpha = 1;

      for (let i = 0; i < N; i++) {
        const panel = buildPanelBoundary(cx, cy, R, N, i, getNorm);
        fillPanelGradient(panel, hexToRgb(CATEGORIES[i].color), pal);
      }
    }

    function drawFabricGuides(p, cx, cy, R, N) {
      p.noFill();
      for (let i = 0; i < N; i++) {
        const panel = buildPanelBoundary(cx, cy, R, N, i, (j) => dataNorm(animMD[j]));
        const [wx, wy] = panel.waistCurve[0];
        const [hx, hy] = panel.hemCurve[0];
        const rgb = hexToRgb(CATEGORIES[i].color);
        p.stroke(rgb[0], rgb[1], rgb[2], 55);
        p.strokeWeight(1.1);
        p.line(wx, wy, hx, hy);
        p.stroke(255, 255, 255, 28);
        p.strokeWeight(0.6);
        p.line(wx, wy, hx, hy);
      }

      p.stroke(255, 255, 255, 7);
      p.strokeWeight(0.5);
      for (const frac of [0.45, 0.7, 0.92]) {
        traceSkirtPath(buildSkirtPoints(cx, cy, R, N, () => WAIST_NORM + (1 - WAIST_NORM) * frac * 0.55));
      }
    }

    function drawWaistband(p, pal, cx, cy, R, N) {
      const ic = pal.inner;
      const pts = buildSkirtPoints(cx, cy, R, N, () => WAIST_NORM, 14);

      p.drawingContext.shadowColor = pal.glow;
      p.drawingContext.shadowBlur = 10;
      p.noFill();
      p.stroke(ic[0], ic[1], ic[2], 130);
      p.strokeWeight(4.5);
      traceSkirtPath(pts);
      p.drawingContext.shadowBlur = 0;

      p.stroke(255, 255, 255, 65);
      p.strokeWeight(1.2);
      traceSkirtPath(buildSkirtPoints(cx, cy, R, N, () => WAIST_NORM * 0.97, 14));

      p.stroke(0, 0, 0, 35);
      p.strokeWeight(1);
      traceSkirtPath(buildSkirtPoints(cx, cy, R, N, () => WAIST_NORM * 1.04, 14));
    }

    function drawHem(p, pal, cx, cy, R, N) {
      const ic = pal.inner;
      const hemPts = buildSkirtPoints(cx, cy, R, N, (i) => dataNorm(animMD[i]), 14);

      p.drawingContext.shadowColor = pal.glow;
      p.drawingContext.shadowBlur = 16;
      p.noFill();
      p.stroke(ic[0], ic[1], ic[2], 215);
      p.strokeWeight(2.4);
      traceOpenPath(hemPts);
      p.drawingContext.shadowBlur = 0;

      p.stroke(255, 255, 255, 75);
      p.strokeWeight(0.9);
      traceOpenPath(hemPts);
    }

    function traceOpenPath(points) {
      p.beginShape();
      for (const [x, y] of points) p.vertex(x, y);
      p.endShape();
    }

    function drawBaseline(p, cx, cy, R, N) {
      p.drawingContext.setLineDash([4, 8]);
      p.noFill();
      p.stroke(255, 255, 255, 22);
      p.strokeWeight(0.8);
      traceSkirtPath(buildSkirtPoints(cx, cy, R, N, (i) => {
        const cat = CATEGORIES[i];
        const bv = cat.base || cat.max * 0.5;
        return bv / cat.max;
      }));
      p.drawingContext.setLineDash([]);
    }

    function drawMarkers(p, pal, cx, cy, R, N) {
      for (let i = 0; i < N; i++) {
        const norm = dataNorm(animMD[i]);
        const a = spoke(i);
        const [px, py] = dressXY(cx, cy, R, a, norm);
        const rgb = hexToRgb(CATEGORIES[i].color);

        p.drawingContext.shadowColor = pal.glow;
        p.drawingContext.shadowBlur = 12;
        p.noStroke();
        p.fill(rgb[0], rgb[1], rgb[2], 230);
        p.ellipse(px, py, 11, 11);
        p.drawingContext.shadowBlur = 0;

        p.fill(255, 255, 255, 200);
        p.ellipse(px, py, 5, 5);
        p.fill(255, 255, 255, 120);
        p.ellipse(px - 1.5, py - 1.5, 2, 2);
      }
    }

    function roundRectPath(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    function drawLabelPill(w, h, r) {
      roundRectPath(p.drawingContext, -w / 2, -h / 2, w, h, r);
      p.drawingContext.fill();
    }

    function boxRayExtent(angle, half) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const tx = Math.abs(cos) > 0.001 ? half / Math.abs(cos) : Infinity;
      const ty = Math.abs(sin) > 0.001 ? half / Math.abs(sin) : Infinity;
      return Math.min(tx, ty);
    }

    function skirtBoundaryDist(cx, cy, R, angle, spokeIdx) {
      const hemNorm = dataNorm(animMD[spokeIdx]);
      const [hx, hy] = dressXY(cx, cy, R, angle, hemNorm);
      const hemDist = Math.hypot(hx - cx, hy - cy);
      const overlayDist = boxRayExtent(angle, layout.overlaySize * 0.5);
      return Math.max(hemDist, overlayDist);
    }

    function drawCategoryLabelCard(w, h, accentRgb) {
      const ctx = p.drawingContext;
      const x = -w / 2;
      const y = -h / 2;
      const r = 3;

      ctx.fillStyle = 'rgba(6, 5, 16, 0.96)';
      roundRectPath(ctx, x, y, w, h, r);
      ctx.fill();

      ctx.strokeStyle = `rgb(${accentRgb.join(',')})`;
      ctx.lineWidth = 1.5;
      roundRectPath(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r);
      ctx.stroke();

      ctx.fillStyle = `rgb(${accentRgb.join(',')})`;
      ctx.fillRect(x + 1, y + 3, 2, h - 6);
    }

    function labelExtents(cardW, cardH) {
      return {
        halfW: cardW / 2 + 4,
        halfH: cardH / 2 + 4,
      };
    }

    function clampLabelCenter(lx, ly, cardW, cardH) {
      const { W, H, pad, titleZone, headerZone } = layout;
      const { halfW, halfH } = labelExtents(cardW, cardH);
      const minX = pad + halfW;
      const maxX = W - pad - halfW;
      const minY = pad + halfH + headerZone * 0.1;
      const maxY = H - titleZone - pad - halfH;

      return [
        Math.max(minX, Math.min(maxX, lx)),
        Math.max(minY, Math.min(maxY, ly)),
      ];
    }

    function resolveLabelPosition(i, cx, cy, R, cardW, cardH) {
      const a = spoke(i);
      const boundary = skirtBoundaryDist(cx, cy, R, a, i) + layout.labelGap;
      const hemNorm = dataNorm(animMD[i]);
      const [hx, hy] = dressXY(cx, cy, R, a, hemNorm);
      const hemDist = Math.hypot(hx - cx, hy - cy) || 1;

      let dx = (hx - cx) / hemDist;
      let dy = (hy - cy) / hemDist;
      const cardHalf = Math.max(cardW, cardH) * 0.5;
      let dist = boundary + cardHalf;

      let lx = cx + dx * dist;
      let ly = cy + dy * dist;
      [lx, ly] = clampLabelCenter(lx, ly, cardW, cardH);

      const clampedDist = Math.hypot(lx - cx, ly - cy);
      const minDist = boundary + cardHalf * 0.92;
      if (clampedDist < minDist) {
        lx = cx + dx * minDist;
        ly = cy + dy * minDist;
        [lx, ly] = clampLabelCenter(lx, ly, cardW, cardH);
      }

      return [lx, ly, hx, hy];
    }

    function measureLabelCard(p, name, val, labelScale) {
      p.textSize(7.5 * labelScale);
      p.textStyle(p.NORMAL);
      const nameW = p.textWidth(name);
      p.textSize(12 * labelScale);
      p.textStyle(p.BOLD);
      const valW = p.textWidth(val);
      const cardW = Math.max(64, Math.max(nameW, valW) + 26 * labelScale);
      const cardH = 34 * labelScale;
      return { cardW, cardH };
    }

    function drawLabels(p, pal, cx, cy, R, N) {
      const ic = pal.inner;
      const labelScale = Math.min(1, layout.contentW / (300 * layout.scale));
      const items = [];

      for (let i = 0; i < N; i++) {
        const accent = hexToRgb(CATEGORIES[i].color);
        const name = animMD[i].name.toUpperCase();
        const val = '£' + Math.round(animMD[i].val).toLocaleString();
        const { cardW, cardH } = measureLabelCard(p, name, val, labelScale);
        const [lx, ly, hx, hy] = resolveLabelPosition(i, cx, cy, R, cardW, cardH);
        items.push({ accent, name, val, cardW, cardH, lx, ly, hx, hy, labelScale });
      }

      for (const item of items) {
        if (!hideVizLines) {
          p.stroke(item.accent[0], item.accent[1], item.accent[2], 120);
          p.strokeWeight(1);
          p.line(item.hx, item.hy, item.lx, item.ly);
        }
      }

      p.textAlign(p.LEFT, p.CENTER);
      for (const item of items) {
        p.push();
        p.translate(item.lx, item.ly);
        drawCategoryLabelCard(item.cardW, item.cardH, item.accent);

        const textX = -item.cardW / 2 + 10 * item.labelScale;
        p.fill(255, 255, 255, 220);
        p.noStroke();
        p.textSize(7.5 * item.labelScale);
        p.textStyle(p.NORMAL);
        p.text(item.name, textX, -7 * item.labelScale);

        p.fill(ic[0], ic[1], ic[2], 255);
        p.textSize(12 * item.labelScale);
        p.textStyle(p.BOLD);
        p.text(item.val, textX, 8 * item.labelScale);
        p.pop();
      }
    }

    function drawTitle(p, pal, W, H) {
      const ic = pal.inner;
      const total = animMD.reduce((s, d) => s + d.val, 0);
      const totalText = '£' + Math.round(total).toLocaleString();
      const { pad, titleZone } = layout;

      p.textSize(16);
      p.textStyle(p.BOLD);
      p.textAlign(p.CENTER, p.CENTER);
      const pillW = Math.min(W - pad * 2, Math.max(100, p.textWidth(totalText) + 40));

      p.push();
      p.translate(W / 2, H - titleZone * 0.75);
      p.noStroke();
      p.fill(0, 0, 0, 80);
      drawLabelPill(pillW, 32, 4);
      p.fill(255, 255, 255, 14);
      drawLabelPill(pillW - 2, 30, 3);
      p.fill(ic[0], ic[1], ic[2], 255);
      p.text(totalText, 0, 0);
      p.pop();
    }
  }, 'viz-canvas-wrap');
}
