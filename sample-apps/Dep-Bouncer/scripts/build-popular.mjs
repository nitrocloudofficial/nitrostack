import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'src/modules/analysis/data/popular-packages.json');
const keywords = ['react', 'cli', 'test', 'http', 'util', 'build', 'css', 'node', 'typescript', 'lint', 'date', 'string', 'array', 'color', 'log', 'parse', 'server', 'database', 'auth', 'file', 'json', 'web', 'babel', 'eslint', 'express', 'promise', 'stream', 'path', 'url', 'browser', 'webpack', 'vite', 'rollup', 'format', 'request', 'fetch', 'crypto', 'async', 'debug', 'npm'];
const sleep = ms => new Promise(resolveSleep => setTimeout(resolveSleep, ms));

async function getJson(url) {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
      return await response.json();
    } catch (error) {
      // The search API rate-limits bursts (HTTP 429): back off and retry a few times.
      if (attempt >= 4) throw error;
      await sleep(2_000 * 2 ** attempt);
    }
  }
}

const candidates = new Set();
for (const keyword of keywords) {
  const query = new URLSearchParams({ text: keyword, size: '250', popularity: '1.0', quality: '0', maintenance: '0' });
  const result = await getJson(`https://registry.npmjs.org/-/v1/search?${query}`);
  for (const item of result.objects ?? []) if (item.package?.name) candidates.add(item.package.name);
  await sleep(1_000);
}

const names = [...candidates];
const selected = new Set();
const plain = names.filter(name => !name.startsWith('@'));
for (let i = 0; i < plain.length; i += 128) {
  const chunk = plain.slice(i, i + 128);
  const response = await getJson(`https://api.npmjs.org/downloads/point/last-week/${chunk.map(encodeURIComponent).join(',')}`);
  // One name returns a single record; several names return an object keyed by name.
  const records = chunk.length === 1 ? [response] : Object.values(response ?? {});
  for (const item of records)
    if (item?.package && item.downloads >= 500_000) selected.add(item.package);
  await sleep(500);
}
for (const name of names.filter(name => name.startsWith('@')).slice(0, 200)) {
  const item = await getJson(`https://api.npmjs.org/downloads/point/last-week/${name}`);
  if (item?.downloads >= 500_000) selected.add(name);
  await sleep(200);
}

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify([...selected].sort(), null, 2)}\n`);
console.log(`Wrote ${selected.size} popular package names.`);
