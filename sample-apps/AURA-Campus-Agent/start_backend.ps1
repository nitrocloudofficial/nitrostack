# AURA Backend Startup Script
# Run this from the MCP_Project directory:
#   cd HACKATHON\MCP_Project
#   .\start_backend.ps1

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " AURA — Smart Campus Operations Agent" -ForegroundColor Cyan
Write-Host " Starting Backend (FastAPI + 9 MCP Servers)" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Load .env if it exists
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
        }
    }
    Write-Host ".env loaded." -ForegroundColor Green
}

Write-Host ""
Write-Host "Backend API : http://localhost:8000" -ForegroundColor Yellow
Write-Host "API Docs    : http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host ""

python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
