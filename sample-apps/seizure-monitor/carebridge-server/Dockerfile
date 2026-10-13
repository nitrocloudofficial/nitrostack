# Multi-stage production Dockerfile for CAREBRIDGE AI MCP Server
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./
COPY src/widgets/package*.json ./src/widgets/

# Install dependencies
RUN npm ci --prefix src/widgets && npm ci

# Copy application source
COPY . .

# Build widgets and core typescript application
RUN npm run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy package manifests and production node_modules
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/widgets/out ./src/widgets/out

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
