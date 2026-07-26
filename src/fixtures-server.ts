/**
 * A tiny static file server (Node's built-in http module only, no
 * dependencies) that serves fixtures/ at /fixtures/*, so read_threat_report
 * can fetch a real public URL once this process is deployed anywhere with
 * a reachable port — matching the build plan's requirement that the demo
 * fixture have a real URL rather than only a local file path.
 *
 * Runs alongside the MCP stdio server; disabled by setting
 * WARDEN_DISABLE_FIXTURES_SERVER=1.
 */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";

const FIXTURES_DIR = join(process.cwd(), "fixtures");
// Deliberately NOT reading process.env.PORT here — NitroStack's own HTTP
// transport binds that one (defaults to 3000) in production/dual mode.
const PORT = Number(process.env.WARDEN_FIXTURES_PORT ?? 8787);

export function startFixturesServer() {
  if (process.env.WARDEN_DISABLE_FIXTURES_SERVER === "1") return;

  const server = createServer(async (req, res) => {
    const url = req.url ?? "/";
    if (url === "/" || url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", server: "warden-mcp-server", fixtures: ["/fixtures/poisoned-report.html", "/fixtures/clean-report.html"] }));
      return;
    }
    if (!url.startsWith("/fixtures/")) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    const requested = normalize(url.replace(/^\/fixtures\//, ""));
    if (requested.includes("..")) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Bad request");
      return;
    }
    try {
      const filePath = join(FIXTURES_DIR, requested);
      const contents = await readFile(filePath, "utf-8");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(contents);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    }
  });

  server.listen(PORT, () => {
    process.stderr.write(`[warden] fixtures server listening on http://localhost:${PORT}/fixtures/\n`);
  });

  server.on("error", (e) => {
    process.stderr.write(`[warden] fixtures server failed to start: ${(e as Error).message}\n`);
  });
}
