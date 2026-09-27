# FinBridge AI — fallback deploy path.
#
# The NitroCloud CLI has no `deploy` command in @nitrostack/cli 1.0.15 (see
# docs/DEPLOY.md). This container is the escape hatch if the dashboard upload
# path doesn't work at +3:00: it runs anywhere that takes a container.

FROM node:20-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src ./src
# Compile the server only. Widgets are not needed for the MCP surface and the
# widget bundler is the flakiest part of the build.
RUN npx tsc --project tsconfig.json

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build /app/dist ./dist
# data/ MUST ship next to dist/. knowledge.resources.ts resolves it relative to
# the module file (../../../data), so this layout is load-bearing — do not
# flatten it.
COPY data ./data

EXPOSE 3000
ENV MCP_TRANSPORT_TYPE=dual
ENV PORT=3000

CMD ["node", "dist/index.js"]
