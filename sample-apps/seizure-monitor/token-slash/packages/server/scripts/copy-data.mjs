import { existsSync, cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcData = join(root, 'src', 'data');
const distData = join(root, 'dist', 'data');

const distMl = join(root, 'dist', 'ml');
const srcMl = join(root, 'src', 'ml');

const webDist = join(root, '..', 'web', 'dist');
const distPublic = join(root, 'dist', 'public');

mkdirSync(distData, { recursive: true });
mkdirSync(distMl, { recursive: true });

cpSync(join(srcData, 'pricing-table.json'), join(distData, 'pricing-table.json'));
cpSync(join(srcData, 'mock-history.json'), join(distData, 'mock-history.json'));
cpSync(join(srcMl, 'satisfaction-model.json'), join(distMl, 'satisfaction-model.json'));

if (existsSync(webDist)) {
  mkdirSync(distPublic, { recursive: true });
  cpSync(webDist, distPublic, { recursive: true });
  console.log('Copied custom web client assets to dist/public/');
}

console.log('Copied data and ML model files to dist/data/ and dist/ml/');
