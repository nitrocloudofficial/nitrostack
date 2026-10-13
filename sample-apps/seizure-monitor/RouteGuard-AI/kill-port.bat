@echo off
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do (
    echo Killing PID %%a on port 3001
    taskkill /F /PID %%a 2>nul
)
echo Port 3001 cleared.
