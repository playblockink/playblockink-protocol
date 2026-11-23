// JSON fetch with timeout + exponential backoff (base * 2^n + jitter).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function getJson(url, { tries = 4, base = 700, timeout = 8000 } = {}) {
  let err;
  for (let i = 0; i < tries; i++) {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ac.signal, headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error('http ' + res.status);
      return await res.json();
    } catch (e) {
      err = e;
      if (i < tries - 1) await sleep(base * 2 ** i + Math.random() * 250);
    } finally { clearTimeout(to); }
  }
  throw err;
}
