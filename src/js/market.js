import { getJson } from './net.js';
import { loadOwn } from './own.js';
import { setNum } from './countup.js';
import { fmtUsd, fmtCompact, fmtPct, dashChar } from './format.js';

const BRAND_LOGO = './assets/logo-cube.png';
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

/* ---------- trending (follows the market-source record ONLY) ---------- */
async function loadTrending(src, prev) {
  const boosts = await getJson(src.boosts);
  const best = new Map();
  for (const b of Array.isArray(boosts) ? boosts : []) {
    if (b.chainId !== 'solana' || !b.tokenAddress) continue;
    const cur = best.get(b.tokenAddress);
    if (!cur || (b.totalAmount || 0) > (cur.totalAmount || 0)) best.set(b.tokenAddress, b);
  }
  const top = [...best.values()].sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0)).slice(0, 10);
  if (!top.length) throw new Error('no solana boosts');
  const res = await Promise.allSettled(top.map((b) => getJson(src.tokens + b.tokenAddress, { tries: 3 })));
  const items = [];
  top.forEach((b, i) => {
    const old = prev.get(b.tokenAddress);
    const r = res[i];
    const list = r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : [];
    const mine = list.filter((p) => p.baseToken && p.baseToken.address === b.tokenAddress);
    const pairs = (mine.length ? mine : list).slice().sort((x, y) => ((y.volume && y.volume.h24) || 0) - ((x.volume && x.volume.h24) || 0));
    const p = pairs[0];
    if (!p) { if (old) items.push(old); return; } // keep last good per token
    items.push({
      key: b.tokenAddress,
      symbol: (p.baseToken && p.baseToken.symbol) || dashChar,
      name: (p.baseToken && p.baseToken.name) || '',
      price: num(p.priceUsd),
      change: p.priceChange ? num(p.priceChange.h24) : null,
      vol: p.volume ? num(p.volume.h24) : null,
      liq: p.liquidity ? num(p.liquidity.usd) : null,
      imgs: [p.info && p.info.imageUrl, b.icon].filter(Boolean),
      url: p.url || 'https://dexscreener.com/solana/' + b.tokenAddress,
    });
  });
  if (!items.length) throw new Error('no token data');
  return items;
}

/* ---------- DOM builders ---------- */
function tile(imgs, label, brand) {
  const t = document.createElement('span');
  t.className = 'tile';
  const letter = () => {
    t.textContent = ''; t.classList.add('is-letter', 't' + (hash(label) % 4));
    t.textContent = (label && label !== dashChar ? label : '?').trim().charAt(0).toUpperCase();
  };
  const queue = [...imgs];
  if (brand) queue.push(BRAND_LOGO);
  const next = () => {
    const src = queue.shift();
    if (!src) return letter();
    const im = new Image(); im.alt = ''; im.decoding = 'async'; im.referrerPolicy = 'no-referrer';
    im.onload = () => { t.textContent = ''; t.append(im); t.classList.remove('is-letter'); };
    im.onerror = next;
    im.src = src;
  };
  next();
  return t;
}

function cells(row) { return { price: row.querySelector('.c-price'), chg: row.querySelector('.c-chg'), vol: row.querySelector('.c-vol'), liq: row.querySelector('.c-liq') }; }

function makeRow({ rank, own = false, link = true }) {
  const row = document.createElement(link ? 'a' : 'div');
  row.className = 'row spot' + (own ? ' own-row' : '');
  if (link) { row.target = '_blank'; row.rel = 'noopener noreferrer'; }
  else row.setAttribute('aria-disabled', 'true');
  row.setAttribute('role', 'row');
  row.innerHTML =
    `<span class="c-rank num">${rank}</span>` +
    `<span class="c-token"><span class="tok"><b class="sym"></b><i class="nm"></i></span></span>` +
    `<span class="c-price num" data-label="Price"></span>` +
    `<span class="c-chg num" data-label="24h"></span>` +
    `<span class="c-stats"><span class="c-vol num" data-label="Vol"></span>` +
    `<span class="c-liq num" data-label="Liq"></span></span>`;
  return row;
}

function fill(row, it) {
  const tok = row.querySelector('.c-token');
  row.querySelector('.sym').textContent = it.symbol || dashChar;
  row.querySelector('.nm').textContent = it.name || '';
  const sig = it.key + '|' + it.imgs.join(',');
  if (row.dataset.k !== sig) {
    row.dataset.k = sig;
    const old = tok.querySelector('.tile'); if (old) old.remove();
    tok.prepend(tile(it.imgs, it.symbol, row.classList.contains('own-row')));
  }
  if (it.url && row.tagName === 'A') row.href = it.url;
  const c = cells(row);
  setNum(c.price, it.price, fmtUsd);
  setNum(c.chg, it.change, fmtPct);
  c.chg.classList.toggle('up', it.change > 0); c.chg.classList.toggle('down', it.change < 0);
  setNum(c.vol, it.vol, fmtCompact);
  setNum(c.liq, it.liq, fmtCompact);
}

function placeholderOwn(row) {
  const tok = row.querySelector('.c-token');
  row.querySelector('.sym').textContent = 'PLAYBLOCK';
  row.querySelector('.nm').textContent = 'Your brick goes here';
  const t = document.createElement('span'); t.className = 'tile is-brand';
  const im = new Image(); im.alt = 'Playblock'; im.src = BRAND_LOGO; t.append(im);
  tok.prepend(t);
  const dots = '· · · · ·';
  for (const k of ['.c-price', '.c-chg', '.c-vol', '.c-liq']) row.querySelector(k).textContent = dots;
}

/* ---------- ticker ---------- */
function chip(it) {
  const s = document.createElement('span'); s.className = 'tk';
  s.innerHTML = '<b class="tk-sym"></b><span class="tk-p num"></span><span class="tk-c num"></span>';
  return s;
}
function fillChip(s, it) {
  s.querySelector('.tk-sym').textContent = it.symbol || dashChar;
  s.querySelector('.tk-p').textContent = fmtUsd(it.price);
  const c = s.querySelector('.tk-c'); c.textContent = fmtPct(it.change);
  c.classList.toggle('up', it.change > 0); c.classList.toggle('down', it.change < 0);
}

/* ---------- controller ---------- */
export function startMarket(reg, els) {
  const { ownSlot, rows, ticker, pill, pillText, note } = els;
  const src = reg.market;
  const S = { trending: [], own: null, hadTrending: false, busy: false, timer: 0, rowMap: new Map(), tickKey: '' };
  const ca = reg.ca.state === 'stated' ? reg.ca.value : null;

  // own row #1: placeholder when CA absent, live row when stated
  let ownRow = null;
  if (ca) { ownRow = makeRow({ rank: 1, own: true, link: true }); ownRow.dataset.k = ''; fill(ownRow, { key: ca, symbol: dashChar, name: '', imgs: [], url: 'https://dexscreener.com/solana/' + ca, price: null, change: null, vol: null, liq: null }); }
  else { ownRow = makeRow({ rank: 1, own: true, link: false }); placeholderOwn(ownRow); }
  ownSlot.append(ownRow);

  const setStatus = (ok, text) => { pill.dataset.state = ok ? 'live' : 'retry'; pillText.textContent = text; };

  function renderTrending() {
    const list = S.trending.filter((t) => t.key !== ca).slice(0, 9); // dedup: own token never repeats below
    if (!S.hadTrending) return;
    if (!rows.dataset.ready) { rows.textContent = ''; rows.dataset.ready = '1'; }
    const keep = new Set(list.map((t) => t.key));
    for (const [k, el] of S.rowMap) if (!keep.has(k)) { el.remove(); S.rowMap.delete(k); }
    list.forEach((it, i) => {
      let el = S.rowMap.get(it.key);
      if (!el) {
        el = makeRow({ rank: i + 2 }); el.style.setProperty('--i', i); el.classList.add('fade-in');
        S.rowMap.set(it.key, el);
      }
      el.querySelector('.c-rank').textContent = String(i + 2);
      fill(el, it);
      if (rows.children[i] !== el) rows.insertBefore(el, rows.children[i] || null);
    });
  }

  function renderTicker() {
    const list = [...(S.own && S.own.symbol ? [S.own] : []), ...S.trending.filter((t) => t.key !== ca)];
    if (!list.length) return;
    const key = list.map((l) => l.key).join('|');
    if (key !== S.tickKey) {
      S.tickKey = key; ticker.textContent = '';
      for (let copy = 0; copy < 2; copy++) {
        const g = document.createElement('div'); g.className = 'tk-group'; if (copy) g.setAttribute('aria-hidden', 'true');
        list.forEach((it) => g.append(chip(it)));
        ticker.append(g);
      }
      ticker.classList.add('is-live');
    }
    ticker.querySelectorAll('.tk-group').forEach((g) => [...g.children].forEach((c, i) => fillChip(c, list[i])));
  }

  async function cycle() {
    if (S.busy) return; S.busy = true;
    const prev = new Map(S.trending.map((t) => [t.key, t]));
    const jobs = [loadTrending(src, prev)];
    if (ca) jobs.push(loadOwn(src, ca));
    const [tr, ow] = await Promise.allSettled(jobs);
    let ok = true;
    if (tr.status === 'fulfilled') { S.trending = tr.value; S.hadTrending = true; } else ok = false;
    if (ca && ow) { if (ow.status === 'fulfilled') { S.own = ow.value; fill(ownRow, S.own); } else if (!S.own) ok = ok && false; }
    renderTrending(); renderTicker();
    if (!ok && !S.hadTrending) {
      // never had data: dash + error
      if (!rows.dataset.err) {
        rows.dataset.err = '1'; rows.textContent = '';
        for (let i = 0; i < 9; i++) { const r = makeRow({ rank: i + 2, link: false }); r.classList.add('is-dash'); r.querySelector('.sym').textContent = dashChar; for (const k of ['.c-price', '.c-chg', '.c-vol', '.c-liq']) r.querySelector(k).textContent = dashChar; rows.append(r); }
      }
      note.textContent = 'Market source unreachable. Retrying.';
      setStatus(false, 'Retrying');
    } else if (!ok) {
      note.textContent = 'Refresh failed. Showing last good data.';
      setStatus(false, 'Retrying');
    } else {
      note.textContent = ''; setStatus(true, 'Live');
      delete rows.dataset.err;
    }
    S.busy = false;
  }

  const schedule = () => { clearTimeout(S.timer); if (!document.hidden) S.timer = setTimeout(async () => { await cycle(); schedule(); }, 60000); };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearTimeout(S.timer);
    else cycle().then(schedule); // fetch immediately on visible
  });
  cycle().then(schedule);
  return S;
}
