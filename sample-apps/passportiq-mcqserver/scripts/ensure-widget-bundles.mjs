/**
 * Guarantee a widget bundle exists for every @Widget route BEFORE the server boots.
 *
 * ---------------------------------------------------------------------------
 * THE FAILURE THIS PREVENTS
 * ---------------------------------------------------------------------------
 * `@Widget('agent-console')` is resolved at BOOT, not at call time:
 * createComponentFromNextRoute() (core/ui-next/index.js) looks for
 *
 *   src/widgets/out/<route>/index.html   or   src/widgets/out/<route>.html
 *
 * and THROWS if neither exists. The throw happens inside
 * McpApplicationFactory.create(), so the entire server — all 22 tools, not just
 * the widget — fails to start. A fresh `git clone && npm test` would die before
 * a single assertion ran, and the stack trace points into node_modules, which
 * reads like a broken dependency rather than a missing build step.
 *
 * So this script runs as `pretest` and `predev`: it writes a minimal placeholder
 * for any route that has no bundle yet, and leaves real bundles untouched.
 *
 * ---------------------------------------------------------------------------
 * WHY FLAT `<route>.html` AND NOT `<route>/index.html`
 * ---------------------------------------------------------------------------
 * Two different code paths read these files and they do NOT accept the same
 * shapes, which is easy to get wrong:
 *
 *   createComponentFromNextRoute()  accepts BOTH forms (boot-time existence check)
 *   Component.compile()             accepts ONLY `next-<route>.html` or
 *                                   `<route>.html` — it never tries the directory
 *                                   form (core/component.js:50-62)
 *
 * compile() is what actually serves the HTML to the client. So a bundle written
 * as `out/<route>/index.html` satisfies boot and then gets IGNORED at serve time,
 * and core silently substitutes its own generic placeholder — the widget renders
 * as an empty grey frame with no error anywhere. Flat is the only form that works
 * end to end, and it is also exactly what `nitrostack-cli build` emits.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_DIR = path.join(ROOT, 'src', 'widgets', 'out');

/**
 * Must match `widgets.routes` in nitrostack.config.ts and every @Widget(...) in
 * the server. A route present in code but absent here still crashes boot.
 */
const ROUTES = ['officer-dashboard', 'graph-view', 'risk-explanation', 'agent-console', 'console'];

/**
 * The placeholder.
 *
 * Says out loud that it is a placeholder and how to replace it. A blank frame
 * would be indistinguishable from a rendering bug, and someone would spend the
 * afternoon debugging React instead of running `npm run build`.
 */
function placeholder(route) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PassportIQ — ${route}</title>
  <style>
    *{box-sizing:border-box}
    body{margin:0;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;
         background:#0B1020;color:#E6EAF5;display:flex;align-items:center;
         justify-content:center;min-height:100vh;padding:32px}
    .card{max-width:540px;border:1px solid #232C47;border-radius:14px;padding:28px;
          background:#111834}
    h1{margin:0 0 6px;font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:#7C8AB0}
    h2{margin:0 0 14px;font-size:22px}
    p{margin:0 0 10px;font-size:13.5px;line-height:1.65;color:#9FB0D0}
    code{background:#0B1020;border:1px solid #232C47;border-radius:5px;
         padding:2px 6px;font-size:12.5px;color:#7DD3A8}
  </style>
</head>
<body>
  <div class="card">
    <h1>PassportIQ</h1>
    <h2>${route} — bundle not built</h2>
    <p>This is a generated placeholder so the MCP server can boot. The real
       React widget has not been bundled yet.</p>
    <p>Build it with <code>npm run build</code>, which compiles
       <code>src/widgets/app/${route}/page.tsx</code> into
       <code>src/widgets/out/${route}.html</code> and replaces this file.</p>
  </div>
</body>
</html>
`;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const created = [];
const kept = [];

for (const route of ROUTES) {
  const flat = path.join(OUT_DIR, `${route}.html`);
  const nested = path.join(OUT_DIR, route, 'index.html');

  // A real bundle is one the CLI emitted flat. Treat a nested file as absent for
  // serve purposes (see the header) but do not delete it — it may be someone's
  // hand-authored work in progress.
  if (fs.existsSync(flat)) {
    kept.push(route);
    continue;
  }

  if (fs.existsSync(nested)) {
    // Promote it to the form compile() can actually read.
    fs.copyFileSync(nested, flat);
    created.push(`${route} (promoted from nested)`);
    continue;
  }

  fs.writeFileSync(flat, placeholder(route), 'utf8');
  created.push(route);
}

if (created.length > 0) {
  console.log(`[widget-bundles] placeholder(s) written: ${created.join(', ')}`);
}
if (kept.length > 0) {
  console.log(`[widget-bundles] existing bundle(s) kept: ${kept.join(', ')}`);
}
