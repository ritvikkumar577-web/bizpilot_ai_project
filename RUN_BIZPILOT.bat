@echo off
title BizPilot AI - Launcher
echo =======================================================
echo          BIZPILOT AI - PROJECT LAUNCHER 🚀
echo =======================================================
echo.
echo [1/2] Opening BizPilot AI Executive Dashboard in browser...
start "" "%~dp0frontend\index.html"

echo.
echo [2/2] Checking Python environment for FastAPI backend...
python --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Python detected!
    echo Would you like to start the FastAPI Backend Server? (Y/N)
    set /p choice="Enter choice: "
    if /i "%choice%"=="Y" (
        cd "%~dp0backend"
        echo Installing dependencies (if needed)...
        pip install -r requirements.txt
        echo Starting FastAPI Server on http://localhost:8000 ...
        uvicorn app.main:app --reload --port 8000
    )
) else (
    echo Note: Python not found in PATH.
    echo Running BizPilot AI in autonomous browser mode with local storage persistence!
)

echo.
echo BizPilot AI is active. Press any key to exit this window.
pause >nul
