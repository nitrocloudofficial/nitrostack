# ThreatMatrix MCP Server — Production Docker Build
# Multi-stage: builder → runner

# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

RUN npm ci

COPY src ./src
COPY public ./public

RUN npm run build
RUN npx prisma generate

# ─── Stage 2: Runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV LOG_LEVEL=INFO
ENV PORT=3000

# Only install production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy build artifacts
COPY --from=builder /app/dist       ./dist
COPY --from=builder /app/public     ./public
COPY --from=builder /app/generated  ./generated
COPY --from=builder /app/prisma     ./prisma
COPY nitrostack.json                ./nitrostack.json
COPY .env.example                   ./.env.example

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# MCP STDIO or HTTP server depending on env
# For NitroStack Cloud HTTP mode:
CMD ["node", "dist/main.js"]
# For STDIO MCP mode (uncomment and rebuild):
# CMD ["node", "dist/index.js"]
