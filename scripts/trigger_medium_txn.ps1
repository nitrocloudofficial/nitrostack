# Aegis Protocol — Medium Risk Trigger (Windows)
# Expected Score: ~55 — Auto-flagged for async review
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
node "$ScriptDir\trigger.mjs" medium
