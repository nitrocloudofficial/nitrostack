# ═══════════════════════════════════════════════════════════════════
# Aegis Protocol — Universal Demo Launcher (Windows)
# Usage:
#   .\scripts\demo.ps1              → Defaults to 'critical'
#   .\scripts\demo.ps1 safe
#   .\scripts\demo.ps1 medium
#   .\scripts\demo.ps1 critical
# ═══════════════════════════════════════════════════════════════════

param(
    [ValidateSet('safe', 'medium', 'critical')]
    [string]$Scenario = 'critical'
)

Write-Host ""
Write-Host "🛡️  Aegis Protocol — Demo Launcher" -ForegroundColor Cyan
Write-Host "   Scenario: $Scenario" -ForegroundColor White
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
node "$ScriptDir\trigger.mjs" $Scenario
