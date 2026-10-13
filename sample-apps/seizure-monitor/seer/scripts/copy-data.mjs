import { execFileSync } from 'node:child_process';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceDirectory = fileURLToPath(new URL('../src/data/', import.meta.url));
const outputDirectory = fileURLToPath(new URL('../dist/data/', import.meta.url));
const widgetDirectory = fileURLToPath(new URL('../src/widgets/', import.meta.url));
const widgetSourceDirectory = fileURLToPath(new URL('../src/widgets/out/', import.meta.url));
const widgetOutputDirectory = fileURLToPath(new URL('../dist/widgets/out/', import.meta.url));
const widgetBundleAliases = [
  ['dataset-profile', 'next-dataset-profile'],
  ['analysis-plan', 'next-analysis-plan'],
  ['analysis-results', 'next-analysis-results'],
];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(sourceDirectory, outputDirectory, { recursive: true });

// NitroStack registers a `next-<route>` component ID but its CLI emits
// `<route>.html`. Keep both names so the production resource handler can
// resolve every bundled widget.
for (const [route, componentId] of widgetBundleAliases) {
  await cp(
    join(widgetSourceDirectory, `${route}.html`),
    join(widgetSourceDirectory, `${componentId}.html`),
  );
}

await inlineTailwind();

await rm(widgetOutputDirectory, { recursive: true, force: true });
await mkdir(widgetOutputDirectory, { recursive: true });
await cp(widgetSourceDirectory, widgetOutputDirectory, { recursive: true });

/**
 * The NitroStack CLI bundles widgets with esbuild and never runs PostCSS, so
 * the production HTML ships Tailwind class names with no Tailwind stylesheet.
 * Widgets are served as `ui://widget/*.html` resources where a linked
 * stylesheet path would not resolve either, so compile the CSS here and inline
 * it into every bundle. (`next dev` compiles its own CSS, so this is only
 * needed for the production build.)
 */
async function inlineTailwind() {
  const stylesheet = join(widgetSourceDirectory, 'seer.css');

  execFileSync(
    join(widgetDirectory, 'node_modules/.bin/tailwindcss'),
    ['-c', 'tailwind.config.ts', '-i', 'app/globals.css', '-o', stylesheet, '--minify'],
    { cwd: widgetDirectory, stdio: 'pipe' },
  );

  const css = await readFile(stylesheet, 'utf8');
  await rm(stylesheet, { force: true });

  const files = (await readdir(widgetSourceDirectory)).filter((name) => name.endsWith('.html'));
  for (const file of files) {
    const path = join(widgetSourceDirectory, file);
    const html = await readFile(path, 'utf8');
    if (html.includes('data-seer-tailwind')) continue;
    const tag = `<style data-seer-tailwind>${css}</style>`;
    await writeFile(
      path,
      html.includes('</head>') ? html.replace('</head>', `${tag}</head>`) : `${tag}${html}`,
    );
  }

  console.log(`Inlined Tailwind CSS into ${files.length} widget bundle(s).`);
}
