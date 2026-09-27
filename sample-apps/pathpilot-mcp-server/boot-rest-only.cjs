// Standalone REST-only launcher for the PathPilot evidence server (port 3002).
//
// Bypasses NitroStack's STDIO MCP transport so the HTTP listener can be
// started directly as a background process without an MCP host.
//
// Usage:
//   node boot-rest-only.cjs
//   set REST_PORT=3002&& node boot-rest-only.cjs

process.on('unhandledRejection', (err) => {
  console.error('[boot-rest-only] unhandledRejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('[boot-rest-only] uncaughtException:', err);
});

async function main() {
  const mod = await import('./dist/infrastructure/restServer.js');
  const server = mod.restServer;
  if (!server || typeof server.start !== 'function') {
    console.error('[boot-rest-only] ❌ restServer export missing in dist/infrastructure/restServer.js');
    console.error('  → Run `npx tsc -p .` first from the project root to compile.');
    process.exit(1);
  }
  try {
    await server.start();
    console.log('[boot-rest-only] ✔ REST server online. Listening. Press Ctrl+C to stop.');
  } catch (err) {
    console.error('[boot-rest-only] ❌ Failed to start REST server:', err instanceof Error ? err.message : String(err));
    process.exit(2);
  }
}

main();