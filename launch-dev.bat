@echo off
echo ========================================
echo 🚀 Launching Development Environment
echo ========================================
echo.

cd /d "%~dp0"

echo Starting development environment...
echo.

echo [1/4] Enabling CEP Development Mode...
reg add "HKCU\Software\Adobe\CSXS.11" /v "PlayerDebugMode" /t REG_SZ /d "1" /f >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ CEP Development Mode enabled
) else (
    echo ❌ Failed to enable CEP Development Mode
)

echo.
echo [2/4] Starting local development server...
python -m http.server 8206 >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Development server started on port 8206
) else (
    echo ❌ Failed to start development server
    echo Make sure Python is installed and port 8206 is free
    pause
    exit /b 1
)

echo.
echo [3/4] Opening development access page...
start http://localhost:8206/dev-access.html

echo.
echo [4/4] Opening Chrome DevTools access...
start http://localhost:9222

echo.
echo ========================================
echo 🎉 Development Environment Ready!
echo ========================================
echo.
echo 🌐 Access URLs:
echo - Dev Tools: http://localhost:8206/dev-access.html
echo - Extension:  http://localhost:8206/index.html
echo - CEP Console: http://localhost:9222
echo.
echo 📋 Next Steps:
echo 1. Wait for pages to load
echo 2. Open Illustrator and extension
echo 3. Use Chrome DevTools for debugging
echo.
echo Press Ctrl+C in the terminal to stop the server
echo.

python -m http.server 8206
