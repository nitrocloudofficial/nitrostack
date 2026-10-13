# Docker Deployment

**Time to read:** 15 minutes

Deploy your MCP server using Docker for consistent, reproducible deployments across any environment.

## What You'll Learn

- Creating a Dockerfile
- Building images
- Running containers
- Docker Compose
- Production optimization

## Basic Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built server
COPY dist ./dist

# Expose inspector port (optional for stdio mode)
EXPOSE 3000

# Run server
CMD ["node", "dist/index.js"]
```

## Build & Run

### Build Image

```bash
npm run build
docker build -t my-mcp-server .
```

### Run Container

```bash
docker run -d \
  --name mcp-server \
  -p 3000:3000 \
  my-mcp-server
```

## Multi-Stage Build

Optimize image size:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

CMD ["node", "dist/index.js"]
```

## Environment Variables

### Using .env

```dockerfile
# Load environment variables
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# Or use --env-file
```

```bash
docker run -d \
  --env-file .env.production \
  -p 3000:3000 \
  my-mcp-server
```

## Docker Compose

### docker-compose.yml

```yaml
version: '3.8'

services:
  mcp-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      LOG_LEVEL: info
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    
  # Optional: Add database
  database:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - db-data:/var/lib/postgresql/data
    
volumes:
  db-data:
```

### Start Services

```bash
docker-compose up -d
```

## Production Optimizations

### Health Checks

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"
```

### Non-Root User

```dockerfile
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

USER nodejs
```

### Security

```dockerfile
# Install security updates
RUN apk add --no-cache --upgrade bash

# Don't run as root
USER nodejs
```

## Persistent Storage

### Volumes

```bash
docker run -d \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/data:/app/data \
  my-mcp-server
```

## Networking

### Connect Services

```yaml
services:
  mcp-server:
    networks:
      - app-network
  
  redis:
    image: redis:alpine
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

## Best Practices

1. **Use multi-stage builds** - Smaller images
2. **Don't run as root** - Security
3. **Use .dockerignore** - Exclude unnecessary files
4. **Cache layers** - Copy package.json first
5. **Health checks** - Monitor container health
6. **Limit resources** - Set memory/CPU limits
7. **Use specific tags** - node:20-alpine not node:latest

## Example .dockerignore

```
node_modules
npm-debug.log
.git
.env
.env.local
dist
logs
*.log
```

## Troubleshooting

### Container Crashes

```bash
# View logs
docker logs mcp-server

# Check status
docker ps -a
```

### Port Already in Use

```bash
# Change port mapping
docker run -d -p 3001:3000 my-mcp-server
```

### Permission Issues

```bash
# Fix volume permissions
docker run -d \
  -v $(pwd)/logs:/app/logs \
  --user $(id -u):$(id -g) \
  my-mcp-server
```

## Next Steps

Learn deployment strategies:

- [Cloud Platforms](./03-cloud-platforms.md) - Deploy to AWS, GCP, Azure
- [Production Checklist](./01-checklist.md) - Pre-deployment guide
- [Best Practices](../sdk/typescript/17-best-practices.md) - Production best practices

---

[← Back: Production Checklist](./01-checklist.md) | [Next: Cloud Platforms →](./03-cloud-platforms.md)

