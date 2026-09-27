# ============================================================
#  SHARED AGENT MEMORY MCP — ONE-CLICK SETUP
#  Run this file once:  .\setup.ps1
#  It installs everything and tells you what to do next.
# ============================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Shared Agent Memory MCP — Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ----------------------------------------------------------
# 1. CHECK PYTHON
# ----------------------------------------------------------
Write-Host "[1/6] Checking Python..." -ForegroundColor Yellow
try {
    $pyVersion = python --version 2>&1
    Write-Host "  OK: $pyVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Python not found. Install from https://www.python.org/downloads/" -ForegroundColor Red
    Write-Host "  Make sure to check 'Add Python to PATH' during install." -ForegroundColor Red
    exit 1
}

# ----------------------------------------------------------
# 2. CHECK / INSTALL UV
# ----------------------------------------------------------
Write-Host "[2/6] Checking uv (package manager)..." -ForegroundColor Yellow
$uvPath = "$env:USERPROFILE\.local\bin\uv.exe"
if (Test-Path $uvPath) {
    $env:PATH = "$env:USERPROFILE\.local\bin;$env:PATH"
    Write-Host "  OK: uv found at $uvPath" -ForegroundColor Green
} else {
    try {
        $null = Get-Command uv -ErrorAction Stop
        Write-Host "  OK: uv found in PATH" -ForegroundColor Green
    } catch {
        Write-Host "  Installing uv..." -ForegroundColor Yellow
        powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
        $env:PATH = "$env:USERPROFILE\.local\bin;$env:PATH"
        Write-Host "  OK: uv installed" -ForegroundColor Green
    }
}

# ----------------------------------------------------------
# 3. INSTALL PYTHON DEPENDENCIES
# ----------------------------------------------------------
Write-Host "[3/6] Installing Python dependencies (this may take a few minutes)..." -ForegroundColor Yellow
$env:PATH = "$env:USERPROFILE\.local\bin;$env:PATH"
uv sync
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK: All Python packages installed" -ForegroundColor Green
} else {
    Write-Host "  ERROR: uv sync failed. Check the error above." -ForegroundColor Red
    exit 1
}

# ----------------------------------------------------------
# 4. VERIFY KEY PYTHON IMPORTS
# ----------------------------------------------------------
Write-Host "[4/6] Verifying Python packages..." -ForegroundColor Yellow
uv run python -c "import mcp, langgraph, chromadb, fastapi; print('  OK: mcp, langgraph, chromadb, fastapi all importable')"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Some packages failed to import. Try: uv sync --reinstall" -ForegroundColor Red
    exit 1
}

# ----------------------------------------------------------
# 5. CHECK NODE + INSTALL FRONTEND
# ----------------------------------------------------------
Write-Host "[5/6] Setting up frontend..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    Write-Host "  OK: Node.js $nodeVersion" -ForegroundColor Green

    if (Test-Path "dashboard\frontend\package.json") {
        Push-Location "dashboard\frontend"
        npm install
        Pop-Location
        Write-Host "  OK: Frontend dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "  SKIP: dashboard/frontend not found (create it with: cd dashboard && npm create vite@latest frontend -- --template react)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  SKIP: Node.js not installed (only needed for dashboard). Install from https://nodejs.org" -ForegroundColor Yellow
}

# ----------------------------------------------------------
# 6. CREATE .env IF MISSING
# ----------------------------------------------------------
Write-Host "[6/6] Checking .env file..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "  OK: .env file exists" -ForegroundColor Green
} else {
    @"
DEEPSEEK_API_KEY=your_key_here
"@ | Out-File -FilePath ".env" -Encoding utf8
    Write-Host "  CREATED: .env file — edit it and paste your real API key!" -ForegroundColor Yellow
}

# ----------------------------------------------------------
# DONE — PRINT COMMANDS
# ----------------------------------------------------------
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  SETUP COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "If uv was just installed, CLOSE and REOPEN PowerShell so it's in your PATH." -ForegroundColor Yellow
Write-Host "Then use the commands below. (Or prefix each with:" -ForegroundColor Yellow
Write-Host '  $env:PATH = "$env:USERPROFILE\.local\bin;$env:PATH"' -ForegroundColor DarkGray
Write-Host "to use uv in the current window.)" -ForegroundColor Yellow
Write-Host ""
Write-Host "--- QUICK TEST (verify everything works) ---" -ForegroundColor Cyan
Write-Host '  uv run python -c "import mcp, langgraph, chromadb; print(''all good'')"'
Write-Host ""
Write-Host "--- START DASHBOARD (2 terminals) ---" -ForegroundColor Cyan
Write-Host "  Terminal 1:  uv run uvicorn dashboard.api:app --reload --port 8000"
Write-Host "  Terminal 2:  cd dashboard\frontend && npm run dev"
Write-Host "  Then open:   http://localhost:5173"
Write-Host ""
Write-Host "--- CLEAN DATA (before demo) ---" -ForegroundColor Cyan
Write-Host "  Remove-Item -Force data\memory.db -ErrorAction SilentlyContinue"
Write-Host "  Remove-Item -Recurse -Force data\chroma -ErrorAction SilentlyContinue"
Write-Host ""
Write-Host "--- RUN AGENTS (one at a time, watch dashboard) ---" -ForegroundColor Cyan
Write-Host "  uv run python agents/research_agent.py"
Write-Host "  uv run python agents/coding_agent.py"
Write-Host "  uv run python agents/testing_agent.py"
Write-Host ""
Write-Host "--- TEST MCP SERVER (opens browser inspector) ---" -ForegroundColor Cyan
Write-Host "  uv run mcp dev backend/mcp_server.py"
Write-Host ""
Write-Host "--- CHECK STORED MEMORIES ---" -ForegroundColor Cyan
Write-Host '  uv run python -c "from backend.sqlite_store import get_all; print(get_all())"'
Write-Host ""
Write-Host "--- GIT COMMANDS ---" -ForegroundColor Cyan
Write-Host "  git add ."
Write-Host '  git commit -m "full end-to-end demo working"'
Write-Host "  git push"
Write-Host ""
