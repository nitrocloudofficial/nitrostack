# ────────────────────────────────────────────────────────────────────────────
# HealthBridge MCP — Dockerfile
# Builds a production-ready Node.js image for NitroCloud / Docker deployment.
# ────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer-cached)
COPY package*.json ./
RUN npm ci

# Copy source + data fixtures
COPY tsconfig.json ./
COPY src/ ./src/
COPY data/ ./data/

# Compile TypeScript
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Production image — only runtime deps + compiled output
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Compiled JS
COPY --from=builder /app/dist ./dist
# JSON data fixtures (loaded at runtime from dist/../data)
COPY --from=builder /app/data ./data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
