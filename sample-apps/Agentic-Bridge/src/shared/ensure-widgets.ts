/**
 * Startup guard for the widget bundle.
 *
 * NitroStack resolves every `@Widget` route to a static export at
 * `src/widgets/out/<name>/index.html` while it is building the tool list. If that
 * export is missing the factory throws before the transport is even created, the
 * process exits, and an MCP client reports only "the server shut down" — a
 * message that points nowhere near the actual cause. It is the first thing that
 * happens to anyone who clones the repo and runs it without building.
 *
 * `scripts/postinstall.mjs` builds the bundle at install time. This guard exists
 * purely to turn the remaining failure cases into a message that names the fix.
 *
 * It deliberately does NOT build. An earlier version shelled out to `npm run
 * build` here, which was a mistake twice over: the build easily outlasts an MCP
 * client's connection timeout (NitroStudio gives up after 5 attempts and shows
 * "Connection Failed", which is *less* diagnosable than the original error), and
 * on Windows the spawn itself fails — see the CVE-2024-27980 note in
 * postinstall.mjs. Failing in under a millisecond with an actionable sentence
 * beats blocking startup on a subprocess.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Walk up from this file to the directory that owns both package.json and the widgets. */
function findProjectRoot(): string | null {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 8; depth++) {
    if (existsSync(join(dir, 'package.json')) && existsSync(join(dir, 'src', 'widgets'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Which widgets are missing from the static export.
 *
 * Next's export writes EITHER `out/<route>.html` or `out/<route>/index.html`
 * depending on its trailingSlash setting, and NitroStack probes both. An earlier
 * version of this check only looked for the directory form — the build here emits
 * the flat form, so it reported "not built" every single time and the guard
 * rebuilt the bundle on every server start.
 *
 * Checking each route from the manifest (rather than "is anything there?") also
 * catches the stale-build case: pull a branch that adds a widget, and the export
 * is present but incomplete.
 */
function missingWidgets(root: string): string[] {
  const widgetsDir = join(root, 'src', 'widgets');
  const out = join(widgetsDir, 'out');
  if (!existsSync(out)) return ['<the entire export>'];

  const exported = (route: string) =>
    existsSync(join(out, `${route}.html`)) || existsSync(join(out, route, 'index.html'));

  let routes: string[] = [];
  try {
    const manifest = JSON.parse(readFileSync(join(widgetsDir, 'widget-manifest.json'), 'utf8'));
    routes = (manifest.widgets ?? []).map((w: { uri: string }) => String(w.uri).replace(/^\//, ''));
  } catch {
    // No readable manifest: fall back to "did anything at all get exported?".
    const any = readdirSync(out, { withFileTypes: true }).some(
      (e) => (e.isFile() && e.name.endsWith('.html')) || (e.isDirectory() && existsSync(join(out, e.name, 'index.html')))
    );
    return any ? [] : ['<the entire export>'];
  }

  return routes.filter((r) => r && !exported(r));
}

/**
 * Fail fast, and in plain language, when the widget bundle is missing.
 * Returns immediately (a couple of stat calls) in the normal case.
 */
export function ensureWidgetsBuilt(): void {
  const root = findProjectRoot();
  if (!root) return;

  const missing = missingWidgets(root);
  if (missing.length === 0) return;

  throw new Error(
    `The widget bundle is incomplete, so the MCP server cannot start.\n\n` +
      `  Not exported: ${missing.join(', ')}\n\n` +
      '  Run this once in the project folder, then start again:\n\n' +
      '      npm run setup\n\n' +
      '  (`npm install` normally does this for you. If it did not, scroll up in the\n' +
      '   install output for a line starting with [bridge:postinstall].)'
  );
}
