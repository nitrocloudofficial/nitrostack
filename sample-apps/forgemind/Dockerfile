# =============================================================================
# Build Stage 1: Compile the TypeScript MCP Server
# =============================================================================
FROM node:20-alpine AS mcp-builder
WORKDIR /mcp
COPY nitrostack-mcp-server/package*.json ./
RUN npm install
COPY nitrostack-mcp-server/ ./
RUN npm run build

# =============================================================================
# Build Stage 2: Python Backend Gateway + Node Runtime Environment
# =============================================================================
FROM python:3.12-slim

# Install Node.js (Required to run the spawned MCP server subprocess)
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY forgemind_server/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy FastAPI application
COPY forgemind_server/ ./forgemind_server

# Copy compiled TypeScript MCP server files from Stage 1
COPY --from=mcp-builder /mcp /app/nitrostack-mcp-server

EXPOSE 8000

# Run uvicorn starting from the root context
CMD ["python", "-m", "uvicorn", "forgemind_server.api_server:app", "--host", "0.0.0.0", "--port", "8000"]
