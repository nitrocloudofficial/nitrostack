// Reports WCAG contrast ratios of the widget colour pairs (informational, never fails). Run: node scripts/widget-contrast.mjs
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../src/widgets/lib/theme.ts', import.meta.url), 'utf8');
const grab = (name) => Object.fromEntries([...src.slice(src.indexOf(`export const ${name}`)).split('};')[0].matchAll(/'(--[\w-]+)': '(#[0-9A-Fa-f]{6})'/g)].map((m) => [m[1], m[2]]));
const lum = (h) => {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
for (const name of ['LIGHT', 'DARK']) {
  const t = grab(name);
  console.log(`\n${name}`);
  const pairs = [['--text', '--base'], ['--text', '--panel'], ['--muted', '--base'], ['--muted', '--panel'], ['--on-accent', '--accent'], ['--accent-ink', '--panel'], ['--accent-ink', '--base'], ['--accent', '--base'],
    ...['--sev-critical', '--sev-high', '--sev-medium', '--sev-low', '--sev-info', '--state-verified'].map((k) => [k, '--panel'])];
  for (const [a, b] of pairs) console.log(`${a.padEnd(18)} on ${b.padEnd(8)} ${ratio(t[a], t[b]).toFixed(2)}`);
}
