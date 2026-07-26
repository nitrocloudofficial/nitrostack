#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# demo.sh — One-command launcher for any scenario
# Usage:
#   bash scripts/demo.sh safe
#   bash scripts/demo.sh medium
#   bash scripts/demo.sh critical
#   bash scripts/demo.sh           # defaults to 'critical'
# ═══════════════════════════════════════════════════════════════════
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCENARIO="${1:-critical}"

echo ""
echo "🛡️  Aegis Protocol — Demo Launcher"
echo "   Scenario: $SCENARIO"
echo ""

node "$SCRIPT_DIR/trigger.mjs" "$SCENARIO"
