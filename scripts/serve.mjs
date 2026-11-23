// Tiny static server for local checks: node scripts/serve.mjs <dir> <port>
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve, sep } from 'node:path';
const dir = resolve(process.argv[2] || 'dist'); const port = Number(process.argv[3] || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = resolve(join(dir, p.endsWith('/') ? p + 'index.html' : p));
  if (!f.startsWith(dir + sep) && f !== dir) { res.writeHead(403).end(); return; }
  try { const b = await readFile(f); res.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(b); }
  catch { res.writeHead(404).end('not found'); }
}).listen(port, () => console.log(`serving ${dir} on http://localhost:${port}`));
