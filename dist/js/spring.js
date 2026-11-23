// Damped spring solver: x'' = -k(x - target) - c x'. Semi-implicit Euler, fixed 1/240 s sub-step.
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const active = new Set();
let raf = 0, last = 0;
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
  for (const s of [...active]) if (s.step(dt)) active.delete(s);
  raf = active.size ? requestAnimationFrame(frame) : 0;
}
function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }

export class Spring {
  constructor({ value = 0, stiffness = 170, damping = 20, mass = 1, onUpdate, precision = 0.001 } = {}) {
    Object.assign(this, { x: value, v: 0, target: value, k: stiffness, c: damping, m: mass, onUpdate, precision, done: null });
  }
  to(target) {
    this.target = target;
    if (reduced()) { this.x = target; this.v = 0; this.onUpdate(this.x); return Promise.resolve(); }
    active.add(this); kick();
    return new Promise((r) => { this.done = r; });
  }
  step(dt) {
    const h = 1 / 240; let t = dt;
    while (t > 0) {
      const d = Math.min(h, t);
      const a = (-this.k * (this.x - this.target) - this.c * this.v) / this.m;
      this.v += a * d; this.x += this.v * d; t -= d;
    }
    const rest = Math.abs(this.v) < this.precision && Math.abs(this.x - this.target) < this.precision;
    if (rest) { this.x = this.target; this.v = 0; }
    this.onUpdate(this.x);
    if (rest && this.done) { this.done(); this.done = null; }
    return rest;
  }
}
