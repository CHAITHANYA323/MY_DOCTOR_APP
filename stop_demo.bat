@echo off
setlocal enabledelayedexpansion

python backend\stop_demo.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] An error occurred while stopping demo processes.
    pause
    exit /b 1
)

python -c "import time; time.sleep(1)"
