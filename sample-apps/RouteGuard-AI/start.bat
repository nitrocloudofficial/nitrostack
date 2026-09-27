@echo off
echo Killing anything on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo Starting MCP server...
start "MCP Server" cmd /k "node dist/index.js"
echo Done. MCP server running at http://localhost:3000/mcp
