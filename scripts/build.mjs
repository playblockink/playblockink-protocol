// Static build: src/ -> dist/ (deploy output). No dependencies.
// Usage: node scripts/build.mjs [--out dist] [--register path/to/register.json]
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalize } from '../src/js/register.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const out = resolve(root, arg('--out', 'dist'));
const regPath = resolve(root, arg('--register', 'src/data/register.json'));
if (out === root || !out.startsWith(root)) throw new Error('refusing to write outside the project: ' + out);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const d of ['styles', 'js', 'assets']) cpSync(join(root, 'src', d), join(out, d), { recursive: true });

// Logo assets are copied EXPLICITLY (not just by directory) and asserted afterwards.
const LOGO_FILES = ['logo.png', 'logo-sm.png', 'logo-cube.png', 'favicon.svg'];
mkdirSync(join(out, 'assets'), { recursive: true });
for (const f of LOGO_FILES) {
  const from = join(root, 'src/assets', f);
  if (!existsSync(from)) throw new Error('missing logo asset: ' + f);
  cpSync(from, join(out, 'assets', f));
}

const rawReg = JSON.parse(readFileSync(regPath, 'utf8'));
mkdirSync(join(out, 'data'), { recursive: true });
writeFileSync(join(out, 'data/register.json'), JSON.stringify(rawReg, null, 2));
const reg = normalize(rawReg);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const X_PATH = 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z';
const GH_PATH = 'M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z';
const icon = (kind, rec, label) => {
  const svg = kind === 'x'
    ? `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${X_PATH}"/></svg>`
    : `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="${GH_PATH}"/></svg>`;
  // LINK RULE: href exists only for a stated record. Otherwise inert span, no href.
  if (rec.state === 'stated') {
    return `<a class="soc" data-record="${kind}" data-state="stated" href="${esc(rec.url)}" target="_blank" rel="noopener noreferrer" aria-label="${label} ${esc(rec.handle)}">${svg}</a>`;
  }
  return `<span class="soc is-inert" data-record="${kind}" data-state="${rec.state}" role="img" aria-disabled="true" aria-label="${label} (not available yet)">${svg}</span>`;
};

const caBlock = reg.ca.state === 'stated'
  ? `<div class="ca-strip" data-record="ca" data-state="stated"><div class="ca-inner"><span class="ca-label">CA</span><button class="ca-value" type="button" data-copy="${esc(reg.ca.value)}" aria-label="Copy contract address"><span class="ca-text">${esc(reg.ca.value)}</span><span class="ca-feedback" role="status" aria-live="polite">Copy</span></button></div></div>`
  : `<div class="ca-strip" data-record="ca" data-state="${reg.ca.state}"><div class="ca-inner"><span class="ca-label">CA</span><button class="ca-value" type="button" disabled aria-disabled="true" aria-label="Contract address not stated yet"><span class="ca-text">Not stated yet</span><span class="ca-feedback" role="status" aria-live="polite"></span></button></div></div>`;

let html = readFileSync(join(root, 'src/index.html'), 'utf8');
html = html
  .replace('{{REGISTER_JSON}}', JSON.stringify(rawReg).replace(/</g, '\\u003c'))
  .replace('{{SOCIAL_X}}', icon('x', reg.x, 'X'))
  .replace('{{SOCIAL_GH}}', icon('github', reg.github, 'GitHub'))
  .replace('{{CA_BLOCK}}', caBlock);
if (/\{\{[A-Z_]+\}\}/.test(html)) throw new Error('unreplaced template token');
writeFileSync(join(out, 'index.html'), html);

// Logo must exist in dist and be referenced by a correct relative path.
for (const f of ['assets/logo-sm.png', 'assets/logo.png', 'assets/logo-cube.png', 'assets/favicon.svg']) {
  if (!existsSync(join(out, f))) throw new Error('logo missing from dist: ' + f);
  if (!html.includes('./' + f)) throw new Error('index.html does not reference ./' + f);
}
const count = (d) => readdirSync(d).reduce((n, f) => n + (statSync(join(d, f)).isDirectory() ? count(join(d, f)) : 1), 0);
console.log(`build ok -> ${out} (${count(out)} files) ca=${reg.ca.state} x=${reg.x.state} github=${reg.github.state}`);
