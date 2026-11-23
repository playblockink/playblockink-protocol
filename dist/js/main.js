import { normalize } from './register.js';
import { runtimeGate } from './gate.js';
import { startMarket } from './market.js';
import { progressBar, reveal, parallax, spotlight, tabs, headerVar } from './motion.js';

const raw = JSON.parse(document.getElementById('register').textContent);
const reg = normalize(raw);
const $ = (s) => document.querySelector(s);

/* CA slot: inert until a CA is stated */
function wireCopy() {
  const btn = $('[data-record="ca"] .ca-value');
  if (!btn || reg.ca.state !== 'stated') return;
  const fb = $('[data-record="ca"] .ca-feedback');
  let t = 0;
  btn.addEventListener('click', async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(reg.ca.value); ok = true; }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = reg.ca.value; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.append(ta); ta.select(); try { ok = document.execCommand('copy'); } catch (_) { /* noop */ } ta.remove();
    }
    clearTimeout(t);
    fb.textContent = ok ? 'Copied' : 'Press and hold to copy';
    btn.classList.toggle('is-copied', ok);
    t = setTimeout(() => { fb.textContent = 'Copy'; btn.classList.remove('is-copied'); }, 1800);
  });
}

wireCopy();
headerVar();
progressBar();
reveal();
parallax();
spotlight();
tabs();

startMarket(reg, {
  ownSlot: $('#own-slot'), rows: $('#rows'), ticker: $('#ticker'),
  pill: $('#market-pill'), pillText: $('#market-pill-text'), note: $('#board-note'),
});

runtimeGate(document.body, reg);
