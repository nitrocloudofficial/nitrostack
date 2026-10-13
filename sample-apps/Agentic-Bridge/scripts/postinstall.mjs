/**
 * Prepare the widget workspace so `nitrostack-cli build` can bundle it.
 *
 * Invoked from the `build` script (not from an npm lifecycle hook) so that it
 * runs after the full source tree exists on disk. NitroStack Cloud's fixed
 * Dockerfile copies package*.json before `npm ci` and only copies the rest of
 * the tree afterwards, so a `postinstall` hook here would fire before this file
 * exists and crash the install with MODULE_NOT_FOUND. Chaining it into `build`
 * dodges that entirely.
 *
 * What this actually does: `nitrostack-cli build` bundles the widgets and
 * compiles TypeScript, but it assumes the widgets' own npm workspace already
 * has its dependencies installed. This script installs those, and only those,
 * if `src/widgets/node_modules` is missing. It never invokes `npm run build`
 * itself — that would recurse infinitely from inside the `build` script.
 *
 * This deliberately NEVER fails the build. A container image that dies over an
 * optional widget-deps install is worse than the problem it solves; on failure
 * this prints the one command that fixes things locally and exits 0.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const widgets = join(root, 'src', 'widgets');

/**
 * Run npm portably.
 *
 * On Windows the executable is `npm.cmd`, and since Node's fix for
 * CVE-2024-27980 (18.20.2 / 20.12.2+) child_process refuses to launch a
 * .cmd/.bat file unless `shell` is set — it throws EINVAL instead. Without this
 * the whole script failed on Windows, the widgets never got built, and the MCP
 * server then died at startup with "Connection Failed" in the client.
 *
 * `shell: true` is safe here specifically because every argument below is a
 * hardcoded literal; nothing user-supplied is ever interpolated into it.
 */
const isWindows = process.platform === 'win32';
const npm = isWindows ? 'npm.cmd' : 'npm';
const runNpm = (args, opts) =>
  execFileSync(npm, args, { shell: isWindows, windowsHide: true, ...opts });

/** Opt-out for CI stages that install widget dependencies separately. */
if (process.env.BRIDGE_SKIP_POSTINSTALL === 'true') process.exit(0);

const say = (msg) => console.log(`[bridge:prebuild] ${msg}`);

try {
  if (!existsSync(join(widgets, 'node_modules'))) {
    say('installing widget dependencies so nitrostack-cli build can bundle them…');
    runNpm(['install', '--no-audit', '--no-fund'], { cwd: widgets, stdio: 'inherit' });
    say('widget dependencies installed.');
  } else {
    say('widget dependencies already present — nothing to do.');
  }
} catch (error) {
  console.warn(
    `\n[bridge:prebuild] Could not install widget dependencies automatically.\n` +
      `  Reason: ${error instanceof Error ? error.message : String(error)}\n\n` +
      `  The MCP server will NOT start until the widget bundle exists. Run this once:\n\n` +
      `      npm run setup\n\n` +
      `  (This is only a warning — the build itself will still attempt to continue.)\n`
  );
  process.exit(0);
}
