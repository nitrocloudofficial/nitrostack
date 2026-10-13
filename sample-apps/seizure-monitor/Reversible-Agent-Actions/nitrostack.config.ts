// NOTE on production transport (HTTP/SSE vs stdio): this file has no
// transport-related field, and @nitrostack/core's CLI/build tooling never
// reads one from here — confirmed by searching the installed @nitrostack/cli
// and @nitrostack/core packages. Dual HTTP+stdio transport is switched on
// automatically by NitroStackServer.start() based on NODE_ENV (anything other
// than 'development'/'dev'/unset -> dual) and binds to process.env.PORT/HOST.
// See src/index.ts and .env.example for the actual mechanism and required vars.
export default {
  name: 'reversible-agent-actions',
  version: '1.0.0',
  description: 'Saga Transaction Engine & Reversible Agent Actions Framework',
  widgets: {
    dir: 'src/widgets',
    routes: ['txn-timeline'],
  },
};
