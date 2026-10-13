@echo off
color 0B
echo ========================================================
echo     Starting Sentinel AI Bank Fraud Investigation...
echo ========================================================
echo.
echo [1/3] Installing and compiling the React UI...
call npm --prefix src/widgets install
call npm --prefix src/widgets run build

echo.
echo [2/3] Installing backend dependencies...
call npm install
call npm run build

echo.
echo [3/3] Launching Secure Server for NitroStudio...
call npm run dev

pause