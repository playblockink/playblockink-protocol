import { reduced } from './spring.js';
import { isNum, dashChar } from './format.js';

// Count-up on first value, flash (up/down) on every later change.
export function setNum(el, value, fmt) {
  if (!isNum(value)) { el.textContent = dashChar; delete el.dataset.v; return; }
  const prev = el.dataset.v === undefined ? null : Number(el.dataset.v);
  el.dataset.v = String(value);
  if (prev === value) return;
  if (reduced()) { el.textContent = fmt(value); return; }
  if (prev !== null) {
    el.classList.remove('flash-up', 'flash-down'); void el.offsetWidth;
    el.classList.add(value > prev ? 'flash-up' : 'flash-down');
  }
  const from = prev === null ? 0 : prev, dur = prev === null ? 800 : 500, t0 = performance.now();
  cancelAnimationFrame(el._raf);
  clearTimeout(el._fin);
  // rAF is paused in background/throttled contexts: guarantee the final value lands anyway
  el._fin = setTimeout(() => { cancelAnimationFrame(el._raf); el.textContent = fmt(value); }, dur + 120);
  const tick = (t) => {
    const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(from + (value - from) * e);
    if (p < 1) el._raf = requestAnimationFrame(tick); else el.textContent = fmt(value);
  };
  el._raf = requestAnimationFrame(tick);
}
