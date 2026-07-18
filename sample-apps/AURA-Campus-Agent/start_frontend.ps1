# AURA Frontend Startup Script
# Run this from the MCP_Project directory:
#   cd HACKATHON\MCP_Project
#   .\start_frontend.ps1

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " AURA — Smart Campus Operations Agent" -ForegroundColor Cyan
Write-Host " Starting Frontend (Vite + React)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend URL : http://localhost:3000" -ForegroundColor Yellow
Write-Host ""

Set-Location frontend
npm run dev -- --port 3000
