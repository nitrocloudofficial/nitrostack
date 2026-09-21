import { cp, mkdir, writeFile } from 'node:fs/promises';
await mkdir('dist/fixtures', { recursive: true });
await cp('fixtures', 'dist/fixtures', { recursive: true });
console.log('Copied fixture assets to dist/fixtures');

// nitrostack-cli start expects dist/index.js — re-export the real entrypoint
await writeFile('dist/index.js', 'export * from "./src/index.js";\n');
console.log('Created dist/index.js entrypoint');

