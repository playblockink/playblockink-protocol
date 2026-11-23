// GATE WARNING: match address-shaped strings against the stated registry.
// Never blanket-reject 0x hex — a 0x string is only flagged when it is not a stated record.
// The CA record is exempt from the scan.
const ADDR = /\b(?:0x[0-9a-fA-F]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})\b/g;
export function scanAddresses(text, reg) {
  const stated = new Set();
  const found = [];
  for (const m of text.matchAll(ADDR)) {
    const s = m[0];
    if (reg.ca.state === 'stated' && s === reg.ca.value) continue; // CA exempt
    if (stated.has(s)) continue;
    found.push(s);
  }
  return found;
}
export function runtimeGate(root, reg) {
  const hits = scanAddresses(root.innerText || '', reg);
  if (hits.length) {
    root.setAttribute('data-gate-warning', String(hits.length));
    console.warn('[gate] address-shaped strings not in stated registry:', hits);
  }
  return hits;
}
