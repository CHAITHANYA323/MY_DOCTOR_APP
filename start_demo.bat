@echo off
setlocal enabledelayedexpansion

echo ======================================================================
echo             MEDICONNECT MULTI-HOSPITAL PLATFORM
echo                STUDENT DEMONSTRATION LAUNCHER
echo ======================================================================
echo.

:: 1. Run Pre-Flight Checks
python backend\check_demo_prerequisites.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Pre-flight verification failed.
    echo Please resolve the issues listed above and try running start_demo.bat again.
    echo.
    pause
    exit /b 1
)

echo.
echo [1/3] Starting Backend API Server (Waitress WSGI on port 5000)...
start "MediConnect Backend (Waitress:5000)" cmd /k "title MediConnect Backend (Waitress:5000) && cd backend && python -m waitress --port=5000 --threads=4 app:app"

echo [2/3] Starting Frontend Dev Server (Vite on port 5173)...
start "MediConnect Frontend (Vite:5173)" cmd /k "title MediConnect Frontend (Vite:5173) && cd frontend && npm run dev"

echo [3/3] Waiting for servers to initialize...
python -c "import time; time.sleep(3)"

echo.
echo Opening browser to http://localhost:5173 ...
start http://localhost:5173

echo.
echo ======================================================================
echo            MEDICONNECT DEMO SERVERS RUNNING!
echo ======================================================================
echo   Frontend Portal:  http://localhost:5173
echo   Backend API:      http://127.0.0.1:5000/api
echo   Health Check:     http://127.0.0.1:5000/api/health
echo ----------------------------------------------------------------------
echo   Demonstration Personas (Passwords in documentation):
echo   1. Platform Owner:       owner@mediconnect.com
echo   2. Hospital Super Admin: admin.hosp1@medicare.com
echo   3. Receptionist:         reception.hosp1@medicare.com
echo   4. Doctor:               dr.one@medicare.com
echo   5. Patient:              patient.alpha@test.com
echo ----------------------------------------------------------------------
echo   TO STOP THE DEMO:
echo   Run 'stop_demo.bat' OR close the two backend/frontend console windows.
echo ======================================================================
echo.
pause

