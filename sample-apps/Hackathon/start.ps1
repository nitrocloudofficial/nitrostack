$ErrorActionPreference = "Stop"

$VENV_DIR = ".venv"

if (-not (Test-Path -Path $VENV_DIR)) {
    Write-Host "Creating Python virtual environment in $VENV_DIR..."
    python -m venv $VENV_DIR
}

Write-Host "Activating virtual environment..."
$ActivateScript = Join-Path $VENV_DIR "Scripts\Activate.ps1"
if (Test-Path -Path $ActivateScript) {
    & $ActivateScript
} else {
    Write-Error "Could not find virtual environment activation script at $ActivateScript"
    exit 1
}

Write-Host "Installing dependencies from requirements.txt..."
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

Write-Host "Starting HELIX Server..."
# Ensure we are in the root directory and the pipeline module is resolvable
$env:PYTHONPATH = (Get-Location).Path
python pipeline/server/main.py
