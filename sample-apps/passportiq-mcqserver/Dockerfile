# PassportIQ — production image for NitroCloud.
#
# NitroCloud containerises from the repo, so this is the explicit contract rather
# than a guess. Three things here are load-bearing and are the usual cause of a
# green build that serves nothing:
#
#  1. TWO npm projects. `src/widgets/` has its own package.json (React 18) because
#     the widget bundler resolves React from `src/widgets/node_modules`. Installing
#     only the root manifest produces bundles with no React and a blank iframe.
#
#  2. `src/widgets/out/` MUST survive into the runtime image. `Component.compile()`
#     reads `src/widgets/out/<id>.html` from disk at request time — it is not
#     compiled into dist/. A runtime image without it throws at boot on the first
#     @Widget registration and takes down all 26 tools.
#
#  3. HOST=0.0.0.0. NitroStack's HTTP transport defaults to `localhost`, which in a
#     container binds loopback only and is unreachable from the platform probe.
#     NODE_ENV must be `production` or the server starts stdio-only and never
#     listens at all.

FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY src/widgets/package.json src/widgets/package-lock.json ./src/widgets/
RUN npm --prefix src/widgets ci --no-audit --no-fund

COPY tsconfig.json tsconfig.test.json nitrostack.config.ts ./
COPY scripts ./scripts
COPY src ./src

# esbuild bundles the five widget routes to src/widgets/out/*.html, then tsc emits
# dist/. `postbuild` re-runs the bundle guard because `nitrostack-cli build` wipes
# src/widgets/out/ at the start of every run.
RUN npm run build

# ---------------------------------------------------------------------------
FROM node:20-slim AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/widgets/out ./src/widgets/out
COPY --from=builder /app/src/widgets/widget-manifest.json ./src/widgets/widget-manifest.json
COPY --from=builder /app/src/data ./src/data
COPY nitrostack.config.ts ./

RUN chown -R node:node /app
USER node

EXPOSE 8080

# The console's own health endpoint, not just a TCP check: it asserts the tool
# registry actually resolved, which is the failure mode that matters.
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/console/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
