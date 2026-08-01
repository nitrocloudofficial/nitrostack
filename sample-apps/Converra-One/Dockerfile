# Multi-Stage Dockerfile for Converra One Enterprise MCP App

FROM node:20-alpine AS base
WORKDIR /app

# Stage 1: Dependencies
FROM base AS deps
COPY package*.json ./
RUN npm ci

# Stage 2: Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build || true

# Stage 3: Runner
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public 2>/dev/null || true

EXPOSE 3000
CMD ["npm", "run", "dev"]
