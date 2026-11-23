import { Spring, reduced } from './spring.js';

const all = (s, r = document) => [...r.querySelectorAll(s)];

/* Scroll progress bar (spring-smoothed) */
export function progressBar() {
  const bar = document.querySelector('.progress i'); if (!bar) return;
  const spring = new Spring({ stiffness: 260, damping: 30, onUpdate: (x) => { bar.style.transform = `scaleX(${Math.max(0, Math.min(1, x))})`; } });
  const read = () => { const h = document.documentElement; spring.to(h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)); };
  addEventListener('scroll', read, { passive: true }); read();
}

/* Scroll-reveal: spring-driven opacity / translate / scale, staggered within a batch */
export function reveal() {
  const els = all('[data-reveal]');
  if (reduced()) { els.forEach((e) => e.classList.add('is-in')); return; }
  els.forEach((e) => { e.style.opacity = '0'; });
  const run = (el) => {
    el.classList.add('is-in');
    const sp = new Spring({ stiffness: 150, damping: 17, onUpdate: (x) => {
      el.style.opacity = String(Math.min(1, Math.max(0, x)));
      el.style.transform = `translate3d(0,${(1 - x) * 28}px,0) scale(${0.97 + 0.03 * x})`;
    } });
    const settle = () => { el.style.transform = ''; el.style.opacity = ''; };
    sp.to(1).then(settle);
    setTimeout(settle, 2500); // rAF can be paused (hidden pane): never leave content invisible
  };
  const io = new IntersectionObserver((entries) => {
    entries.filter((e) => e.isIntersecting).forEach((e, i) => {
      io.unobserve(e.target);
      setTimeout(() => run(e.target), i * 70);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  els.forEach((e) => io.observe(e));
}

/* Hero parallax: pointer + scroll, each axis spring-smoothed */
export function parallax() {
  const root = document.querySelector('[data-parallax]'); if (!root || reduced()) return;
  const layers = all('[data-depth]', root).map((el) => ({ el, d: Number(el.dataset.depth) }));
  const st = { px: 0, py: 0, sy: 0 };
  const apply = () => {
    for (const { el, d } of layers) el.style.transform = `translate3d(${st.px * d * 18}px,${st.py * d * 14 - st.sy * d * 40}px,0)`;
  };
  const sx = new Spring({ stiffness: 90, damping: 16, onUpdate: (v) => { st.px = v; apply(); } });
  const sy = new Spring({ stiffness: 90, damping: 16, onUpdate: (v) => { st.py = v; apply(); } });
  const ss = new Spring({ stiffness: 120, damping: 20, onUpdate: (v) => { st.sy = v; apply(); } });
  // toy box tilt: mouse only, --tx/--ty in [-1,1] (CSS multiplies by 4px), spring-smoothed
  const box = root.querySelector('.toybox');
  const bx = new Spring({ stiffness: 140, damping: 18, onUpdate: (v) => box && box.style.setProperty('--tx', v.toFixed(3)) });
  const by = new Spring({ stiffness: 140, damping: 18, onUpdate: (v) => box && box.style.setProperty('--ty', v.toFixed(3)) });
  addEventListener('pointermove', (e) => {
    const nx = (e.clientX / innerWidth - 0.5) * 2, ny = (e.clientY / innerHeight - 0.5) * 2;
    sx.to(nx); sy.to(ny);
    if (e.pointerType === 'mouse') { bx.to(nx); by.to(ny); }
  }, { passive: true });
  addEventListener('scroll', () => ss.to(Math.min(1.5, scrollY / Math.max(1, innerHeight))), { passive: true });
}

/* Spotlight hover: writes --mx / --my on pointer move */
export function spotlight() {
  document.addEventListener('pointermove', (e) => {
    const t = e.target.closest && e.target.closest('.spot'); if (!t) return;
    const r = t.getBoundingClientRect();
    t.style.setProperty('--mx', e.clientX - r.left + 'px');
    t.style.setProperty('--my', e.clientY - r.top + 'px');
  }, { passive: true });
}

/* Tabs: scroll-spy */
export function tabs() {
  const links = all('.site-tab'); if (!links.length) return;
  const map = new Map(links.map((l) => [l.getAttribute('href').slice(1), l]));
  const io = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) links.forEach((l) => l.classList.toggle('is-active', l === map.get(e.target.id)));
  }, { rootMargin: '-35% 0px -55% 0px' });
  map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
}

/* Header height var for sticky offsets */
export function headerVar() {
  const h = document.querySelector('.site-header'); if (!h) return;
  const set = () => document.documentElement.style.setProperty('--header-h', h.offsetHeight + 'px');
  new ResizeObserver(set).observe(h); set();
}
