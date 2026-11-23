export const dashChar = '—';
export const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export function fmtUsd(v) {
  if (!isNum(v)) return dashChar;
  if (v >= 1000) return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (v >= 1) return '$' + v.toFixed(2);
  if (v >= 0.01) return '$' + v.toFixed(4);
  if (v === 0) return '$0';
  const s = v.toPrecision(4);
  return '$' + (s.includes('e') ? v.toFixed(12).replace(/0+$/, '') : s);
}
export function fmtCompact(v) {
  if (!isNum(v)) return dashChar;
  return '$' + new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(v);
}
export function fmtPct(v) {
  if (!isNum(v)) return dashChar;
  return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + '%';
}
