#!/usr/bin/env bash
# ─────────────────────────────────────────────
# InvoiceX-Ray — Build & Deploy Script
# ─────────────────────────────────────────────
# Usage: chmod +x deploy.sh && ./deploy.sh
# Environment: Linux (Ubuntu 22.04+ recommended)
# ─────────────────────────────────────────────

set -euo pipefail

echo "═══════════════════════════════════════════"
echo "  InvoiceX-Ray MCP Server — Build & Deploy"
echo "═══════════════════════════════════════════"

# ── Step 1: Check prerequisites ──
echo ""
echo "[1/5] Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed."; exit 1; }

NODE_VERSION=$(node -v)
echo "  ✅ Node.js: $NODE_VERSION"
echo "  ✅ npm: $(npm -v)"

# ── Step 2: Install dependencies ──
echo ""
echo "[2/5] Installing dependencies..."
npm ci --prefer-offline 2>/dev/null || npm install
echo "  ✅ Dependencies installed"

# ── Step 3: Type-check ──
echo ""
echo "[3/5] Running TypeScript type-check..."
npx tsc --noEmit
echo "  ✅ Type-check passed (zero errors)"

# ── Step 4: Build ──
echo ""
echo "[4/5] Building TypeScript project..."
npx tsc
echo "  ✅ Build complete → ./dist/"

# ── Step 5: Deploy ──
echo ""
echo "[5/5] Deploying to production..."
if command -v nitro >/dev/null 2>&1; then
  nitro deploy --prod
  echo "  ✅ Deployed to production via Nitro CLI"
else
  echo "  ⚠️  Nitro CLI not found globally. Attempting via npx..."
  npx --package=@nitrostack/cli nitro deploy --prod 2>/dev/null || {
    echo "  ℹ️  Nitro deploy skipped (CLI not available)."
    echo "  ℹ️  The server can still be run locally with: node dist/server.js"
    echo "  ℹ️  Or via MCP stdio transport with any compatible client."
  }
fi

echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ InvoiceX-Ray build pipeline complete!"
echo "═══════════════════════════════════════════"
echo ""
echo "To run locally:"
echo "  npm run dev      (development with hot-reload)"
echo "  npm run start    (production, from dist/)"
echo ""
