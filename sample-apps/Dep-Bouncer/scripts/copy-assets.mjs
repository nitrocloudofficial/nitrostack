// Copies the JSON data the server reads at runtime from src/ into dist/ (tsc only emits .js).
import { cpSync, existsSync } from 'node:fs';

const assets = ['modules/analysis/data', 'modules/incidents/fixtures'];
for (const dir of assets) {
  if (existsSync(`src/${dir}`)) cpSync(`src/${dir}`, `dist/${dir}`, { recursive: true });
}
console.log(`Copied ${assets.length} asset folders into dist/`);
