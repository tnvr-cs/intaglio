const running = new Map();

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export function cancelCounter(id) {
  const anim = running.get(id);
  if (anim) cancelAnimationFrame(anim.raf);
  running.delete(id);
}

export function animateValue(id, el, to, options = {}) {
  const {
    duration = 650,
    prefix = '£',
    suffix = '',
    decimals = 0,
    formatter,
  } = options;

  const from = Number(el.dataset.value) || 0;
  const target = Number(to) || 0;

  cancelCounter(id);

  if (from === target) {
    el.dataset.value = String(target);
    el.textContent = formatDisplay(target, prefix, suffix, decimals, formatter);
    return;
  }

  const start = performance.now();

  function formatDisplay(val, pre, suf, dec, fmt) {
    if (fmt) return fmt(val);
    const n = dec > 0 ? val.toFixed(dec) : Math.round(val).toLocaleString();
    return `${pre}${n}${suf}`;
  }

  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = easeOutCubic(t);
    const current = from + (target - from) * eased;
    el.dataset.value = String(current);
    el.textContent = formatDisplay(current, prefix, suffix, decimals, formatter);

    if (t < 1) {
      running.set(id, { raf: requestAnimationFrame(tick) });
    } else {
      el.dataset.value = String(target);
      el.textContent = formatDisplay(target, prefix, suffix, decimals, formatter);
      running.delete(id);
    }
  }

  running.set(id, { raf: requestAnimationFrame(tick) });
}

export function animateBar(el, toPct, duration = 650) {
  if (!el) return;
  el.style.transition = `width ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
  requestAnimationFrame(() => {
    el.style.width = `${Math.max(0, Math.min(100, toPct))}%`;
  });
}

export function pulseElement(el) {
  if (!el) return;
  el.classList.remove('counter-pulse');
  void el.offsetWidth;
  el.classList.add('counter-pulse');
}
