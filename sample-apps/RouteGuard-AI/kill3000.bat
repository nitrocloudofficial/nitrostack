@echo off
echo Searching for process on port 3000...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000 "') do (
    echo Killing PID %%a
    taskkill /F /PID %%a 2>nul
)
echo Done.
