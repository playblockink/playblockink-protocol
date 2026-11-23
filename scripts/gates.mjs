// Gate runner. Usage: node scripts/gates.mjs <distDir>
// Every anchor is state-independent: each check reads the CURRENT record (dist/data/register.json)
// and derives its expectation from it, so the same gates prove both the absent and the stated branch.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalize } from '../src/js/register.js';
import { scanAddresses } from '../src/js/gate.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, process.argv[2] || 'dist');
const read = (p) => readFileSync(join(dist, p), 'utf8');
const walk = (d, out = []) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p, out) : out.push(p); } return out; };

const raw = JSON.parse(read('data/register.json'));
const reg = normalize(raw);
const htmlSrc = read('index.html');

const visible = (h) => h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
const anchor = (h, rec) => { const m = h.match(new RegExp(`<(a|span|div)[^>]*data-record="${rec}"[^>]*>`)); return m ? m[0] : null; };
const attr = (tag, name) => { const m = tag && tag.match(new RegExp(`\\s${name}="([^"]*)"`)); return m ? m[1] : null; };
const DATE_RES = [/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? \d{1,2}\b/i, /\b\d{4}-\d{2}-\d{2}\b/, /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/, /\b20\d{2}\b/, /\b\d{1,2}:\d{2}(:\d{2})?\b/, /\bas of\b/i, /\bchecked\b/i, /\bupdated\b/i, /\bmonday|tuesday|wednesday|thursday|friday|saturday|sunday\b/i];

// pure checks: (html) -> [{id,name,ok,detail}]
function htmlChecks(html) {
  const r = [];
  const add = (id, name, ok, detail = '') => r.push({ id, name, ok: !!ok, detail });
  // CA
  const ca = anchor(html, 'ca');
  add('CA-1', 'CA anchor present, data-state equals register', ca && attr(ca, 'data-state') === reg.ca.state, attr(ca, 'data-state'));
  const btn = (html.match(/<button class="ca-value"[^>]*>/) || [''])[0];
  const caStated = reg.ca.state === 'stated';
  add('CA-2', caStated ? 'CA stated: full address rendered + data-copy' : 'CA inert: button disabled, no address, no data-copy',
    caStated ? html.includes(`>${reg.ca.value}<`) && attr(btn, 'data-copy') === reg.ca.value && !/ disabled/.test(btn)
             : / disabled/.test(btn) && attr(btn, 'data-copy') === null && scanAddresses(visible(html), reg).length === 0);
  // social anchors
  for (const [k, label] of [['x', 'X'], ['github', 'GitHub']]) {
    const t = anchor(html, k); const rec = reg[k];
    add(`SOC-${k}-1`, `${label} icon present`, !!t && /<svg/.test(html.slice(html.indexOf(t), html.indexOf(t) + 1200)));
    add(`SOC-${k}-2`, `${label} state-matched`, t && attr(t, 'data-state') === rec.state);
    add(`SOC-${k}-3`, rec.state === 'stated' ? `${label} href equals stored URL` : `${label} inert: no href`,
      rec.state === 'stated' ? attr(t, 'href') === rec.url : (t && !/\shref=/.test(t) && /aria-disabled="true"/.test(t)));
  }
  add('SOC-4', 'official X mark path', html.includes('M18.901 1.153h3.68l-8.04 9.19'));
  add('SOC-5', 'official GitHub Octicon path', html.includes('M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59'));
  // no labels beside icons
  const actions = (html.match(/<div class="site-actions">([\s\S]*?)<\/div>\s*<\/div>/) || [, ''])[1];
  add('SOC-6', 'social icons are icon-only (no text nodes)', visible(actions).trim() === '');
  // dates
  const vis = visible(html);
  add('DATE-1', 'no visible dates / timestamps / "as of"', !DATE_RES.some((re) => re.test(vis)), DATE_RES.find((re) => re.test(vis)) + '');
  // address scan (0x never blanket-rejected; CA exempt)
  add('ADDR-1', 'address-shaped strings match stated registry', scanAddresses(vis, reg).length === 0, scanAddresses(vis, reg).join(','));
  return r;
}

const results = [];
const add = (id, name, ok, detail = '') => results.push({ id, name, ok: !!ok, detail });

/* ---------- assets / logo in dist ---------- */
for (const f of ['assets/logo.png', 'assets/logo-sm.png', 'assets/logo-cube.png', 'assets/favicon.svg']) {
  add(`LOGO-${f}`, `dist contains ${f}`, existsSync(join(dist, f)));
  add(`LOGO-ref-${f}`, `index.html references ./${f}`, htmlSrc.includes(`./${f}`));
}
for (const f of ['logo.png', 'logo-sm.png', 'logo-cube.png']) {
  const b = existsSync(join(dist, 'assets', f)) ? readFileSync(join(dist, 'assets', f)) : Buffer.alloc(0);
  add(`PNG-${f}`, `${f} is a PNG with colortype 6 (RGBA)`, b.length > 1000 && b.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' && b[25] === 6);
}
const fav = read('assets/favicon.svg');
add('FAV-1', 'favicon is SVG 32x32', /viewBox="0 0 32 32"/.test(fav) && /width="32" height="32"/.test(fav));
add('FAV-2', 'index.html links favicon', /<link rel="icon" type="image\/svg\+xml" href="\.\/assets\/favicon\.svg">/.test(htmlSrc));

/* ---------- register ---------- */
add('REG-1', 'every record has a legal state', ['ca', 'x', 'github'].every((k) => ['stated', 'absent', 'unconfirmed'].includes(reg[k].state)));
add('REG-2', 'market source records match the specified endpoints',
  reg.market.state === 'stated' && reg.market.boosts === 'https://api.dexscreener.com/token-boosts/top/v1' && reg.market.tokens === 'https://api.dexscreener.com/tokens/v1/solana/' && reg.market.pairs === 'https://api.dexscreener.com/latest/dex/tokens/' && reg.market.pump === 'https://frontend-api.pump.fun/coins/');
add('REG-3', 'chain is Solana mainnet with the specified RPC', reg.chain.value === 'solana' && reg.chain.rpc === 'https://solana-rpc.publicnode.com');
add('REG-4', 'register embedded in page equals register.json', (() => { const m = htmlSrc.match(/<script type="application\/json" id="register">([\s\S]*?)<\/script>/); return m && JSON.stringify(JSON.parse(m[1].replace(/\\u003c/g, '<'))) === JSON.stringify(raw); })());

results.push(...htmlChecks(htmlSrc));

/* ---------- css / js static rules ---------- */
const cssFiles = walk(join(dist, 'styles')).filter((f) => f.endsWith('.css'));
const jsFiles = walk(join(dist, 'js')).filter((f) => f.endsWith('.js'));
const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const leaks = [];
for (const f of [...cssFiles, ...jsFiles, join(dist, 'index.html')]) {
  if (f.endsWith('tokens.css')) continue;
  const txt = readFileSync(f, 'utf8').replace(/&#\d+;/g, '').replace(/href="#[a-z-]+"/g, '').replace(/id="#?[a-z-]+"/g, '');
  const m = txt.match(HEX); if (m) leaks.push(relative(dist, f) + ':' + m.slice(0, 3).join(','));
}
add('PAL-1', 'no colour literal outside tokens.css (favicon.svg is the traced asset)', leaks.length === 0, leaks.join(' '));
add('PAL-2', 'tokens.css documents palette provenance', /PALETTE PROVENANCE/.test(read('styles/tokens.css')));
const allCss = cssFiles.map((f) => readFileSync(f, 'utf8')).join('\n');
add('CSS-1', 'no ch units', !/\d(?:\.\d+)?ch\b/.test(allCss));
add('CSS-2', 'prefers-reduced-motion disables all animation', /@media \(prefers-reduced-motion:reduce\)\{[^@]*\*,\*::before,\*::after\{animation:none!important;transition-duration:\.01ms!important\}/.test(allCss));
const kfs = [...allCss.matchAll(/@keyframes (\w+)/g)].map((m) => m[1]);
const unused = kfs.filter((k) => !new RegExp('animation:[^;}]*\\b' + k + '\\b').test(allCss));
add('CSS-5', 'every @keyframes block is applied to an element (' + kfs.length + ' blocks)', unused.length === 0, unused.join(','));
add('CSS-3', 'own row: 2px accent left border + ownPulse + reduced-motion none', /\.own-row\{border-left:2px solid var\(--color-accent\)[^}]*ownPulse/.test(allCss) && /\.own-row\{animation:none\}/.test(allCss) && /@keyframes ownPulse/.test(allCss));
add('CSS-4', '44px tap token and soc/ca/tab sizes use it', /--tap:44px/.test(allCss) && /\.soc\{[^}]*width:var\(--tap\);height:var\(--tap\)/.test(allCss) && /--tabs-h:44px/.test(allCss));
const js = (f) => readFileSync(join(dist, 'js', f), 'utf8');
const market = js('market.js'), own = js('own.js'), net = js('net.js');
const lt = market.slice(market.indexOf('async function loadTrending'), market.indexOf('/* ---------- DOM builders'));
add('MKT-1', 'trending fetch follows market-source record only (no CA reference)', lt.length > 200 && !/\bca\b|reg\.ca/.test(lt));
add('MKT-2', 'trending filters chainId solana, top 10 by totalAmount, per-token fetch', /chainId !== 'solana'/.test(lt) && /totalAmount/.test(lt) && /slice\(0, 10\)/.test(lt) && /src\.tokens \+/.test(lt));
add('MKT-3', 'exponential backoff', /2 \*\* i/.test(net));
add('MKT-4', 'poll 60s, pause on hidden, fetch immediately on visible', /60000/.test(market) && /visibilitychange/.test(market) && /document\.hidden/.test(market));
add('MKT-5', 'last good data kept on refresh failure', /keep last good/.test(market) && /Showing last good data/.test(market));
add('MKT-6', 'dash + error when source fails with no data', /Market source unreachable/.test(market) && /dashChar/.test(market));
add('OWN-1', 'pump.fun + DexScreener fetched in parallel (allSettled), neither blocks', /Promise\.allSettled\(\[\s*getJson\(src\.pairs/.test(own) && /getJson\(src\.pump/.test(own));
add('OWN-2', 'pair chosen by volume.h24 desc, pairs[0]', /volume\.h24/.test(own) && /pairs\[0\]/.test(own));
add('OWN-3', 'logo order pump -> dex -> brand -> letter', /image_uri[\s\S]*imageUrl/.test(own) && /queue\.push\(BRAND_LOGO\)/.test(market) && /is-letter/.test(market));
add('OWN-4', 'placeholder row uses brand logo, non-clickable, dots', /placeholderOwn/.test(market) && /· · · · ·/.test(market) && /link: false/.test(market));
add('OWN-5', 'own token deduped from trending rows', /filter\(\(t\) => t\.key !== ca\)/.test(market));
add('DATE-2', 'no Date formatting in runtime code', !jsFiles.some((f) => /new Date|toLocale(Date|Time)String|Date\.now/.test(readFileSync(f, 'utf8'))));

/* ---------- repo hygiene (project root, not dist) ---------- */
const hygieneFiles = []; const skip = new Set(['node_modules', 'dist', '.proof', 'brand', 'reference', '.git']);
(function w(d) { for (const f of readdirSync(d)) { if (skip.has(f)) continue; const p = join(d, f); statSync(p).isDirectory() ? w(p) : hygieneFiles.push(p); } })(root);
add('HYG-1', 'no CLAUDE.md and no .claude/ directory', !existsSync(join(root, 'CLAUDE.md')) && !existsSync(join(root, '.claude')));
const AI = /co-authored-by|generated with|claude|anthropic|openai|chatgpt|as an ai\b|ai-generated|\bllm\b/i;
const textExt = /\.(md|json|html|css|js|mjs|py|svg|txt)$|LICENSE$/;
const hits = hygieneFiles.filter((f) => textExt.test(f) && AI.test(readFileSync(f, 'utf8')) && !f.endsWith('gates.mjs')).map((f) => relative(root, f));
add('HYG-2', 'no AI attribution anywhere in repo', hits.length === 0, hits.join(' '));
for (const f of ['README.md', 'docs/whitepaper.md', 'LICENSE']) add(`REPO-${f}`, `${f} exists`, existsSync(join(root, f)));
add('REPO-LIC', 'LICENSE is MIT, PLAYBLOCK, 2026', existsSync(join(root, 'LICENSE')) && /MIT License/.test(readFileSync(join(root, 'LICENSE'), 'utf8')) && /Copyright \(c\) 2026 PLAYBLOCK/.test(readFileSync(join(root, 'LICENSE'), 'utf8')));

/* ---------- mutation harness (anchors read current record at runtime) ---------- */
const mutations = [];
const flipLink = (k) => (h) => { const t = anchor(h, k); if (!t) return h; const has = /\shref=/.test(t); return h.replace(t, has ? t.replace(/\shref="[^"]*"/, '') : t.replace(/^<(\w+)/, '<$1 href="https://example.com/x"')); };
mutations.push(['X link flipped (add href if inert / drop href if stated)', flipLink('x')]);
mutations.push(['GitHub link flipped', flipLink('github')]);
mutations.push(['CA flipped (strip address if stated / inject if inert)', (h) => caStatedFlip(h)]);
mutations.push(['visible date injected', (h) => h.replace('<main>', '<main><p>Nov 20, 2026</p>')]);
mutations.push(['stray address-shaped string injected', (h) => h.replace('<main>', '<main><p>Bk3Pq7WxYzAbCdEfGhJkLmNpQrStUvWxYz12345678</p>')]);
mutations.push(['text label injected beside icons', (h) => h.replace('<div class="site-actions">', '<div class="site-actions">Follow us ')]);
function caStatedFlip(h) {
  if (reg.ca.state === 'stated') return h.split(reg.ca.value).join('REMOVED');
  return h.replace(/<button class="ca-value"[^>]*>/, (m) => m.replace(' disabled aria-disabled="true"', '').replace('type="button"', 'type="button" data-copy="So11111111111111111111111111111111111111112"')).replace('Not stated yet', 'So11111111111111111111111111111111111111112');
}
let killed = 0;
for (const [name, fn] of mutations) {
  const bad = htmlChecks(fn(htmlSrc)).filter((c) => !c.ok);
  const ok = bad.length > 0; if (ok) killed++;
  add(`MUT-${killed + (ok ? 0 : 0)}-${name.slice(0, 18)}`, `mutation killed: ${name}`, ok, ok ? 'caught by ' + bad.map((b) => b.id).join(',') : 'SURVIVED');
}

/* ---------- report ---------- */
let fail = 0;
for (const c of results) { if (!c.ok) fail++; console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.id.padEnd(28)} ${c.name}${c.ok || !c.detail ? '' : '  [' + c.detail + ']'}`); }
console.log(`\nbranch: ca=${reg.ca.state} x=${reg.x.state} github=${reg.github.state}`);
console.log(`GATES: ${results.length - fail}/${results.length} passed, ${fail} failed; mutations killed ${killed}/${mutations.length}`);
process.exit(fail ? 1 : 0);
