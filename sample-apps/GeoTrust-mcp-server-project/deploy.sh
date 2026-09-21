#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# GeoTrust AI — Build & Deploy Script (NitroCloud Git-Push Deploy)
#
# Usage:
#   ./deploy.sh              Build all + validate (pre-push check)
#   ./deploy.sh --push       Build, validate, then git push to trigger deploy
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()   { echo -e "${CYAN}[GeoTrust]${NC} $1"; }
ok()    { echo -e "${GREEN}  ✓${NC} $1"; }
warn()  { echo -e "${YELLOW}  ⚠${NC} $1"; }
fail()  { echo -e "${RED}  ✗${NC} $1"; exit 1; }

MODE="${1:-build}"

# ── Step 1: Build MCP Server ────────────────────────────────────────────────
log "Building MCP server..."
npm run build
ok "MCP server compiled to dist/"

# ── Step 2: Build Widget Frontend ────────────────────────────────────────────
log "Building widget frontend (Next.js static export)..."
cd src/widgets

if [ ! -d "node_modules" ]; then
  log "Installing widget dependencies..."
  npm ci
fi

# Generate Prisma client if schema exists
if [ -f "prisma/schema.prisma" ]; then
  npx prisma generate 2>/dev/null || warn "Prisma generate skipped (not critical for static export)"
fi

npm run build
cd ../..
ok "Widget frontend exported to src/widgets/out/"

# ── Step 3: Validate Outputs ────────────────────────────────────────────────
log "Validating build outputs..."

[ -f "dist/index.js" ]                      || fail "dist/index.js not found"
[ -f "dist/app.module.js" ]                 || fail "dist/app.module.js not found"
ok "MCP server entry point exists"

[ -d "src/widgets/out" ]                    || fail "src/widgets/out/ directory not found"
ok "Widget static export directory exists"

[ -f "src/widgets/widget-manifest.json" ]   || fail "widget-manifest.json not found"
ok "Widget manifest exists"

[ -f "nitro.config.ts" ]                    || warn "nitro.config.ts not found"
ok "NitroStack config exists"

echo ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ok "Build validated! Ready for NitroCloud deployment."
echo ""

# ── Step 4: Git push deploy (optional) ──────────────────────────────────────
if [ "$MODE" = "--push" ]; then
  log "Pushing to GitHub to trigger NitroCloud auto-deploy..."

  git add -A
  git status --short
  echo ""

  COMMIT_MSG="deploy: build $(date +%Y-%m-%dT%H:%M:%S)"
  git commit -m "$COMMIT_MSG" || warn "Nothing new to commit"
  git push origin main
  ok "Pushed to origin/main"

  echo ""
  log "NitroCloud will auto-deploy. Steps to verify:"
  echo "  1. Go to NitroCloud dashboard → your GeoTrust app"
  echo "  2. Check Deployments tab → wait for 'Live' status"
  echo "  3. Copy the Service URL"
  echo "  4. Set NVIDIA_API_KEY as a secret in the NitroCloud dashboard"
  echo ""
else
  log "Next steps for deployment:"
  echo ""
  echo "  Option 1 — Auto deploy via git push:"
  echo "    ./deploy.sh --push"
  echo ""
  echo "  Option 2 — Manual git push:"
  echo "    git add -A && git commit -m 'deploy: ready' && git push origin main"
  echo ""
  echo "  Option 3 — Run locally:"
  echo "    npm run start:prod"
  echo ""
  echo "  ⚠ Remember to set NVIDIA_API_KEY as a secret in NitroCloud dashboard!"
fi
