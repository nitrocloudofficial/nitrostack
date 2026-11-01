// Screenshots of the widget's Assessment view (light/dark, 1920x1080 and 1280x720, inline 640x400) into docs/img.
// The Playwright installed here is the Python package, so this wrapper runs scripts/widget_shots.py.
// Start the widgets dev server first (cd src/widgets && node node_modules/next/dist/bin/next dev -p 3417).
// Usage: node scripts/widget-shots.mjs [--base URL] [--out DIR] [--only name,name]
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./widget_shots.py', import.meta.url));
const r = spawnSync('python3', [script, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(r.status ?? 1);
