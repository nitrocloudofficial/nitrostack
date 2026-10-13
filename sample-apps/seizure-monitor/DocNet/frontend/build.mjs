import * as esbuild from '../node_modules/esbuild/lib/main.js';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function build() {
  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  console.log('⚡ Building NitroProj Triage Frontend...');

  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src', 'main.tsx')],
    bundle: true,
    outfile: path.join(distDir, 'bundle.js'),
    loader: {
      '.tsx': 'tsx',
      '.ts': 'ts',
      '.css': 'css'
    },
    jsx: 'automatic',
    nodePaths: [path.join(__dirname, '..', 'src', 'widgets', 'node_modules')]
  });

  // Write standalone index.html linking bundle.js and Tailwind CSS CDN for instant rendering
  const htmlContent = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>NitroProj Triage - Autonomous Medical Assistant</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
      body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #f8fafc; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script src="./bundle.js"></script>
  </body>
</html>`;

  fs.writeFileSync(path.join(distDir, 'index.html'), htmlContent);
  console.log('✅ Build completed successfully at dist/index.html & dist/bundle.js');
}

build().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
