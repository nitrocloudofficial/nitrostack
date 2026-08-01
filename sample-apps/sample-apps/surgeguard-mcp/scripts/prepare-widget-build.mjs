import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const widgetRoot = path.join(repositoryRoot, 'src', 'widgets');
const existingBuildDirectories = process.argv.includes('--dev')
  ? ['.next-dev']
  : ['out', '.next'];
const presentDirectories = existingBuildDirectories.filter((name) =>
  fs.existsSync(path.join(widgetRoot, name)));

if (presentDirectories.length) {
  const archiveRoot = path.join(
    repositoryRoot,
    'tmp',
    'widget-build-cache',
    `${Date.now()}-${process.pid}`,
  );
  fs.mkdirSync(archiveRoot, { recursive: true });

  for (const name of presentDirectories) {
    const source = path.join(widgetRoot, name);
    const destination = path.join(archiveRoot, name);
    const retryableErrors = new Set(['EBUSY', 'ENOTEMPTY', 'EPERM']);
    let moved = false;

    for (let attempt = 0; attempt < 20 && !moved; attempt += 1) {
      try {
        await fs.promises.rename(source, destination);
        moved = true;
      } catch (error) {
        const code = error && typeof error === 'object' && 'code' in error
          ? String(error.code)
          : '';
        if (!retryableErrors.has(code) || attempt === 19) throw error;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  }

  console.log(`Prepared clean widget build directories (${presentDirectories.join(', ')}).`);
}
