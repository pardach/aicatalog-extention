@echo off
echo ========================================
echo Vector Catalog Extension - Node.js Server
echo ========================================
echo.

cd /d "%~dp0"

echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js from: https://nodejs.org
    echo Or use Python: python -m http.server 8206
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js found
echo.

echo Enabling CEP Development Mode...
reg add "HKCU\Software\Adobe\CSXS.11" /v "PlayerDebugMode" /t REG_SZ /d "1" /f >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ CEP Development Mode enabled
) else (
    echo ❌ Failed to enable CEP Development Mode
)

echo.
echo Checking http-server...
npx http-server --version >nul 2>&1
if errorlevel 1 (
    echo Installing http-server globally...
    npm install -g http-server
)

echo.
echo Starting local debug server on port 8206...
echo.
echo ========================================
echo 🌐 ACCESS URLs:
echo ========================================
echo.
echo 🔍 Test Connection: http://localhost:8206/test-connection.html
echo 🐛 Debug Page:      http://localhost:8206/debug-local.html
echo 📱 Extension:       http://localhost:8206/index.html
echo 🎨 CEP Extension:   cep://com.yourcompany.newextension.panel/
echo.
echo ========================================
echo 📋 Instructions:
echo ========================================
echo.
echo 1. Open your browser
echo 2. Go to: http://localhost:8206/test-connection.html
echo 3. If successful, open: http://localhost:8206/index.html
echo.
echo Press Ctrl+C to stop the server
echo.

npx http-server -p 8206 -c-1

pause
