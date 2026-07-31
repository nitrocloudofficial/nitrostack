# ═══════════════════════════════════════════════════════════════════
# Aegis Protocol — PowerShell Trigger Scripts (Windows)
# ═══════════════════════════════════════════════════════════════════
# Usage:
#   .\scripts\trigger_safe_txn.ps1
#   .\scripts\trigger_medium_txn.ps1
#   .\scripts\trigger_digital_arrest.ps1
#   .\scripts\demo.ps1 [safe|medium|critical]
# ═══════════════════════════════════════════════════════════════════

param(
    [ValidateSet('safe', 'medium', 'critical')]
    [string]$Scenario = 'safe'
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
node "$ScriptDir\trigger.mjs" $Scenario
