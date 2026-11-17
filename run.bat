@echo off
title Student Life OS Launcher
echo ========================================================
echo          STARTING STUDENT LIFE OS FULL-STACK APP
echo ========================================================
echo.
echo [1/2] Starting Flask Backend Server (Port 5000)...
start "Student Life OS - Backend" cmd /k "cd /d %~dp0backend && venv\Scripts\activate && python app.py"

timeout /t 2 /nobreak >nul

echo [2/2] Starting React Vite Frontend (Port 5173)...
start "Student Life OS - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================================
echo  Services started successfully!
echo  👉 Web App URL:  http://localhost:5173/
echo  👉 Backend API:  http://127.0.0.1:5000/
echo ========================================================
