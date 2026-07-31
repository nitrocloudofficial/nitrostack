#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# trigger_medium_txn.sh — Medium Risk Demo
# Expected Score: 55 — Auto-flagged for async review, no live interception
# ═══════════════════════════════════════════════════════════════════
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/trigger.mjs" medium
