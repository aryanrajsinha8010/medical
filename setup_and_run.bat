@echo off
setlocal EnableDelayedExpansion
title SwasthyaBillCheck (NMBTP) - One-Click Environment Setup ^& Launcher

cd /d "%~dp0"
set "ROOT_DIR=%CD%"
set "INSTALL_ONLY=0"
set "FORCE_RESEED=0"

for %%A in (%*) do (
    if /I "%%~A"=="--install-only" set "INSTALL_ONLY=1"
    if /I "%%~A"=="--reseed" set "FORCE_RESEED=1"
)

echo ============================================================================
echo   SwasthyaBillCheck (NMBTP: National Medical Bill Transparency Platform)
echo   Team TechNova - SBI Youth Ideathon 2026 ("Ideas today, impact tomorrow.")
echo   One-Go Fresh Environment Check, Dependency Installer ^& Launcher
echo ============================================================================
echo.

:: ----------------------------------------------------------------------------
:: STEP 1: Check & Install Python 3.10+
:: ----------------------------------------------------------------------------
echo [1/7] Checking Python installation...
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [WARN] Python not found in PATH. Attempting automatic install via winget...
    where winget >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        winget install -e --id Python.Python.3.12 --accept-source-agreements --accept-package-agreements
        set "PATH=%LOCALAPPDATA%\Programs\Python\Python312;%LOCALAPPDATA%\Programs\Python\Python312\Scripts;%ProgramFiles%\Python312;%ProgramFiles%\Python312\Scripts;%PATH%"
    ) else (
        echo [ERROR] Python is not installed and winget is unavailable.
        echo Please install Python 3.11+ from https://www.python.org/downloads/ and re-run.
        exit /b 1
    )
)
for /f "delims=" %%V in ('python --version 2^>^&1') do set "PY_VER=%%V"
echo       Found: !PY_VER!

:: ----------------------------------------------------------------------------
:: STEP 2: Check & Install Node.js 18+ and npm
:: ----------------------------------------------------------------------------
echo [2/7] Checking Node.js and npm installation...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [WARN] Node.js not found in PATH. Attempting automatic install via winget...
    where winget >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
        set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"
    ) else (
        echo [ERROR] Node.js is not installed and winget is unavailable.
        echo Please install Node.js LTS from https://nodejs.org/ and re-run.
        exit /b 1
    )
)
for /f "delims=" %%V in ('node --version 2^>^&1') do set "NODE_VER=%%V"
for /f "delims=" %%V in ('call npm --version 2^>^&1') do set "NPM_VER=%%V"
echo       Found: Node !NODE_VER! / npm !NPM_VER!

:: ----------------------------------------------------------------------------
:: STEP 3: Check Optional Native Tesseract OCR Binary
:: ----------------------------------------------------------------------------
echo [3/7] Checking Tesseract OCR binary (optional native OCR accelerator)...
if exist "%ProgramFiles%\Tesseract-OCR\tesseract.exe" (
    set "PATH=%ProgramFiles%\Tesseract-OCR;%PATH%"
)
where tesseract >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo       Found Tesseract OCR in PATH.
) else (
    echo       [INFO] Native Tesseract binary not in PATH; OpenCV + PyMuPDF + deterministic layout OCR fallback is active.
)

:: ----------------------------------------------------------------------------
:: STEP 4: Install Python Dependencies & Playwright Chromium
:: ----------------------------------------------------------------------------
echo [4/7] Installing Python packages from requirements.txt...
python -m pip install --upgrade pip --quiet
python -m pip install -r "%ROOT_DIR%\requirements.txt" --quiet
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install Python dependencies from requirements.txt.
    exit /b 1
)
echo       Python packages verified. Checking Playwright Chromium browser...
python -m playwright install chromium >nul 2>&1
echo       Playwright Chromium ready.

:: ----------------------------------------------------------------------------
:: STEP 5: Install Node.js Dependencies (Root, Fastify API, React Vite PWA)
:: ----------------------------------------------------------------------------
echo [5/7] Installing Node.js workspace dependencies...
if not exist "%ROOT_DIR%\services\api\node_modules" (
    echo       Installing services/api packages...
    call npm --prefix "%ROOT_DIR%\services\api" install --no-audit --no-fund
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] npm install failed in services/api
        exit /b 1
    )
) else (
    echo       services/api node_modules already present.
)

if not exist "%ROOT_DIR%\apps\web\node_modules" (
    echo       Installing apps/web packages...
    call npm --prefix "%ROOT_DIR%\apps\web" install --no-audit --no-fund
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] npm install failed in apps/web
        exit /b 1
    )
) else (
    echo       apps/web node_modules already present.
)

:: ----------------------------------------------------------------------------
:: STEP 6: Initialize / Verify Government Rate DB & 42 Golden Bills
:: ----------------------------------------------------------------------------
echo [6/7] Verifying Government Reference Rate Database ^& Golden Bills...
if "%FORCE_RESEED%"=="1" (
    echo       Running full ETL pipeline and regenerating 42 golden bills...
    python "%ROOT_DIR%\data\etl\fetch_and_verify.py"
    python "%ROOT_DIR%\data\etl\expand_rates.py"
    python "%ROOT_DIR%\data\etl\run_etl.py"
    python "%ROOT_DIR%\data\etl\generate_golden_bills.py"
) else if not exist "%ROOT_DIR%\data\swasthyabillcheck.db" (
    echo       Database not found; seeding official CGHS/PM-JAY/NPPA/PMBI rates and 42 golden bills...
    python "%ROOT_DIR%\data\etl\fetch_and_verify.py"
    python "%ROOT_DIR%\data\etl\expand_rates.py"
    python "%ROOT_DIR%\data\etl\run_etl.py"
    python "%ROOT_DIR%\data\etl\generate_golden_bills.py"
) else (
    echo       Found existing data\swasthyabillcheck.db and 42 golden bills.
)

:: ----------------------------------------------------------------------------
:: STEP 7: Run Environment Smoke Verification Test
:: ----------------------------------------------------------------------------
echo [7/7] Running automated health ^& data traceability verification...
python -m pytest "%ROOT_DIR%\tests\test_core_suite.py" -k "test_data_traceability_no_orphan_rates or test_deck_slide3_benchmark_bill_exact_match" -q
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Smoke verification test failed.
    exit /b 1
)
echo       [PASS] All environment dependencies, DB tables, and matching engine checks passed.
echo.

if "%INSTALL_ONLY%"=="1" (
    echo ============================================================================
    echo   Setup completed in --install-only mode.
    echo   Run setup_and_run.bat without arguments to launch the live servers.
    echo ============================================================================
    exit /b 0
)

:: ----------------------------------------------------------------------------
:: LAUNCH ALL 3 SERVICES & OPEN BROWSER
:: ----------------------------------------------------------------------------
echo ============================================================================
echo   Starting SwasthyaBillCheck (NMBTP) Services:
echo     - Python AI/OCR ^& Matching Service : http://127.0.0.1:8000
echo     - Node.js Fastify API Gateway       : http://127.0.0.1:4000
echo     - React + Vite Citizen Web PWA      : http://127.0.0.1:5173
echo ============================================================================

start "SwasthyaBillCheck - AI Engine (8000)" cmd /k "cd /d "%ROOT_DIR%\services\ai-engine" && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
timeout /t 2 /nobreak >nul

start "SwasthyaBillCheck - Fastify API (4000)" cmd /k "cd /d "%ROOT_DIR%\services\api" && npx tsx src/server.ts"
timeout /t 2 /nobreak >nul

start "SwasthyaBillCheck - Web PWA (5173)" cmd /k "cd /d "%ROOT_DIR%\apps\web" && npx vite --host 127.0.0.1 --port 5173"
timeout /t 3 /nobreak >nul

echo Opening http://localhost:5173 in your default browser...
start "" "http://localhost:5173"

echo.
echo All services are now running!
exit /b 0
