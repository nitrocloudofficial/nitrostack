// Small pure formatters shared by the views. No React, never throw.

// 896 -> "0.9 s", 14711 -> "14.7 s", 133425 -> "2 min 13 s", 0 -> "0 s".
export function formatDuration(ms: number | undefined): string {
  if (ms === undefined || !Number.isFinite(ms) || ms < 0) return 'n/a';
  if (ms === 0) return '0 s';
  if (ms < 1000) return ms < 50 ? '<0.1 s' : `${(ms / 1000).toFixed(1)} s`;
  const s = ms / 1000;
  if (s < 60) return `${s < 10 ? s.toFixed(1) : Math.round(s)} s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s - m * 60);
  return r === 60 ? `${m + 1} min` : `${m} min ${r} s`;
}

// "+24" / "-3" / "0": an explicit sign, so a change is never read from colour or position.
export function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0';
}

// "PHP 7.4" style label from the runner's PHP selection.
export function phpLabel(php: { selected?: string } | undefined): string | undefined {
  return php?.selected ? `PHP ${php.selected}` : undefined;
}
