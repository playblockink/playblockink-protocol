import { getJson } from './net.js';

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

// PUMP.FUN PARALLEL: both sources are requested together; neither waits on the other.
export async function loadOwn(src, ca) {
  const [dex, pump] = await Promise.allSettled([
    getJson(src.pairs + ca),
    getJson(src.pump + ca, { tries: 2 }),
  ]);
  const pairs = dex.status === 'fulfilled' && Array.isArray(dex.value && dex.value.pairs)
    ? dex.value.pairs.filter((p) => p.chainId === 'solana')
    : [];
  pairs.sort((a, b) => ((b.volume && b.volume.h24) || 0) - ((a.volume && a.volume.h24) || 0));
  const pair = pairs[0] || null;
  const pf = pump.status === 'fulfilled' && pump.value && typeof pump.value === 'object' ? pump.value : null;
  if (!pair && !pf) throw new Error('own token sources unreachable');
  const bt = (pair && pair.baseToken) || {};
  return {
    key: ca,
    symbol: (pf && pf.symbol) || bt.symbol || null,
    name: (pf && pf.name) || bt.name || null,
    price: pair ? num(pair.priceUsd) : null,
    change: pair && pair.priceChange ? num(pair.priceChange.h24) : null,
    vol: pair && pair.volume ? num(pair.volume.h24) : null,
    liq: pair && pair.liquidity ? num(pair.liquidity.usd) : null,
    // logo order: pump.fun -> DexScreener -> brand asset (appended by the renderer) -> letter tile
    imgs: [pf && pf.image_uri, pair && pair.info && pair.info.imageUrl].filter(Boolean),
    url: 'https://dexscreener.com/solana/' + ca,
  };
}
