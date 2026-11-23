// Register pattern: each external fact is ONE record with state stated|absent|unconfirmed.
// absent / unconfirmed records render inert (no href, no copy value).
// Pure module (no DOM) — shared by the runtime and by scripts/build.mjs.
const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const HANDLE = /^[A-Za-z0-9_]{1,15}$/;
const GH = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

const asState = (rec, valid) => {
  if (!rec || rec.state !== 'stated') return 'absent';
  return valid ? 'stated' : 'unconfirmed';
};

// LINK RULE: store the URL, derive the handle from it.
export function deriveHandle(url, kind) {
  try {
    const u = new URL(url);
    const seg = u.pathname.split('/').filter(Boolean)[0] || '';
    const host = u.hostname.replace(/^www\./, '');
    if (u.protocol !== 'https:') return null;
    if (kind === 'x' && (host === 'x.com' || host === 'twitter.com') && HANDLE.test(seg)) return '@' + seg;
    if (kind === 'github' && host === 'github.com' && GH.test(seg)) return seg;
  } catch (e) { /* fallthrough */ }
  return null;
}

export function normalize(raw) {
  const ca = raw.ca || {};
  const caOk = typeof ca.value === 'string' && B58.test(ca.value);
  const link = (rec, kind) => {
    const handle = rec && rec.url ? deriveHandle(rec.url, kind) : null;
    const state = asState(rec, !!handle);
    return state === 'stated' ? { state, url: rec.url, handle } : { state, url: null, handle: null };
  };
  const m = raw.marketSource || {};
  const mOk = ['boosts', 'tokens', 'pairs', 'pump'].every((k) => typeof m[k] === 'string' && m[k].startsWith('https://'));
  return {
    project: raw.project,
    chain: raw.chain,
    ca: asState(ca, caOk) === 'stated' ? { state: 'stated', value: ca.value } : { state: asState(ca, caOk), value: null },
    x: link(raw.x, 'x'),
    github: link(raw.github, 'github'),
    market: mOk && m.state === 'stated' ? { state: 'stated', ...m } : { state: 'unconfirmed' },
  };
}

// Addresses the page is allowed to print: only stated records.
export function statedAddresses(reg) {
  return reg.ca.state === 'stated' ? [reg.ca.value] : [];
}
