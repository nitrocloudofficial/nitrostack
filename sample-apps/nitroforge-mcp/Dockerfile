# NitroForge -- MCP server that builds MCP servers.
#
# Multi-stage build. The pre-warmed templates/skeleton/ (including its own
# node_modules AND the built widgets/out/ static export) is copied verbatim
# into the final image -- it's what EmitterService copies per-generation at
# runtime, so it has to exist in the running container, not just at build
# time. Runtime writes go to .forge/ (ArtifactStore's disk write-through,
# and EmitterService's .forge/servers/<id>/ output) -- mount that as a
# volume if you want generated servers to survive a container restart;
# it's gitignored and NOT baked into the image.

FROM node:20-slim AS build
WORKDIR /app

# Root app deps -- install with the pinned lockfile, exactly as documented
# in the repo's own setup instructions (never `npm update`).
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
COPY fixtures ./fixtures
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app
# LOAD-BEARING, not just convention: NitroStackServer.start() (server.js)
# derives transport type ENTIRELY from NODE_ENV/MCP_TRANSPORT_TYPE at
# runtime -- NOT from the @McpApp decorator's `transport` field, which was
# tested and confirmed to have zero effect. Without NODE_ENV=production (or
# MCP_TRANSPORT_TYPE=dual/http explicitly), this container would boot in
# stdio-only mode, bind no port, and every health check / HTTP request
# would fail. Verified: real curl POST to :$PORT/mcp with this env var set
# returns a real MCP initialize response over HTTP.
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY --from=build /app/dist ./dist
COPY --from=build /app/fixtures ./fixtures
COPY scripts ./scripts

# The pre-warmed skeleton -- copied as-is, node_modules and built
# widgets/out/ included. This is NOT `npm install`-ed again; it's used
# exactly as EmitterService.emit() expects: `cp` it, clear the
# per-generation parts, render templates into it.
COPY templates/skeleton ./templates/skeleton

# .forge/ is where ArtifactStore and EmitterService write at runtime.
# Created here so the volume mount point exists even before first write.
RUN mkdir -p /app/.forge

VOLUME ["/app/.forge"]

EXPOSE 3000
CMD ["node", "dist/index.js"]
