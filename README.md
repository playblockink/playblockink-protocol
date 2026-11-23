# Playblock

**Snap. Stack. Play.** A toy-brick token on Solana, with a live market board.

[![Live site](https://img.shields.io/badge/live-playblock.ink-33b733?style=flat-square)](https://playblock.ink)
[![Chain](https://img.shields.io/badge/chain-Solana-024916?style=flat-square)](https://solana.com)
[![License: MIT](https://img.shields.io/badge/license-MIT-0e0e0e?style=flat-square)](LICENSE)

| | |
|---|---|
| Chain | Solana mainnet (RPC: `https://solana-rpc.publicnode.com`) |
| Contract address | `CA: not stated yet` (placeholder; set it in `src/data/register.json`) |
| Site | https://playblock.ink |

## Overview

Playblock is a static site for a Solana meme token shaped like a toy brick. The page carries a live board of
boosted Solana tokens, with slot one reserved for the Playblock token itself. The board never depends on the
contract address: it runs from day one, and the own-token row lights up the moment a CA is stated.

## Features

- **Contract address slot** pinned at the top of every screen: full address, large type, click to copy with
  feedback. Inert until a CA is stated.
- **Live market board**: top 10 boosted Solana tokens from DexScreener (logo, symbol, name, price, 24h change,
  volume, liquidity), a ticker built from the same data, skeleton loaders, exponential backoff, last-good data
  kept on a failed refresh, 60 s polling that pauses while the tab is hidden.
- **Own-token row #1**: DexScreener and pump.fun are fetched in parallel; pair chosen by 24h volume; pinned above
  the trending rows and removed from them if it appears there. Before a CA exists it shows a brand-logo placeholder.
- **Register pattern**: every external fact (CA, X, GitHub, market source) is one record with state
  `stated | absent | unconfirmed`. Absent records render inert.
- **Motion**: spring-physics scroll reveals, hero parallax, count-up with change flash, spotlight hover, scroll
  progress bar. `prefers-reduced-motion` turns all of it off.

## Links

- Website: https://playblock.ink
- X: not stated yet
- GitHub: not stated yet
- Whitepaper: [docs/whitepaper.md](docs/whitepaper.md)

## Develop

```bash
npm run build         # src/ -> dist/, then runs every gate
npm run serve         # http://localhost:4173
npm run build:proof   # builds the "everything stated" branch into .proof/ and gates it
```

Deploy the contents of `dist/`. No runtime dependencies, no bundler.

To state a record, edit `src/data/register.json` (set `"state": "stated"` and the value or URL), then rebuild.
Social handles are derived from the stored URL.

## License

MIT, see [LICENSE](LICENSE).
