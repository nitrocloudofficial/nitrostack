#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# trigger_safe_txn.sh — Safe Transaction Demo
# Expected Score: 12 — Transaction clears normally, no @Guard
# ═══════════════════════════════════════════════════════════════════
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/trigger.mjs" safe
