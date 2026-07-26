@echo off
echo ===================================================
echo   Launching ContextOS Full-Stack Platform...
echo   Lead AI Engineer: Haswitheswari KamboJi (Team of 4)
echo ===================================================

echo Starting FastAPI Backend Server on http://localhost:8000 ...
start cmd /k "cd /d C:\Users\Haswitheswari\OneDrive\Desktop\contextos\backend && python -m uvicorn app.main:app --reload"

timeout /t 3 /nobreak >nul

echo Starting Next.js Web App on http://localhost:3000 ...
start cmd /k "cd /d C:\Users\Haswitheswari\OneDrive\Desktop\contextos && npm run dev"

echo ===================================================
echo   Both Web App Servers are Starting!
echo   Open Browser: http://localhost:3000
echo ===================================================
