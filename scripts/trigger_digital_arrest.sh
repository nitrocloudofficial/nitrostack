#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# trigger_digital_arrest.sh — THE STAGE DEMO
# Expected Score: 95 — @Guard triggers, red modal fires, MHA alert dispatched
# ═══════════════════════════════════════════════════════════════════
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/trigger.mjs" critical
