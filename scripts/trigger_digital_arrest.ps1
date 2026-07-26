# Aegis Protocol — THE STAGE DEMO (Windows)
# Expected Score: ~95 — @Guard triggers, red modal fires, MHA alert dispatched
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
node "$ScriptDir\trigger.mjs" critical
