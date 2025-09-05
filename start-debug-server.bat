@echo off
echo ========================================
echo Vector Catalog Extension - Debug Server
echo ========================================
echo.

cd /d "%~dp0"

echo Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo.
    echo Please install Python from: https://python.org
    echo Or use Node.js: npm install -g http-server
    echo Then run: npx http-server -p 8206
    echo.
    pause
    exit /b 1
)

echo ✅ Python found
echo.

echo Enabling CEP Development Mode...
reg add "HKCU\Software\Adobe\CSXS.11" /v "PlayerDebugMode" /t REG_SZ /d "1" /f >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ CEP Development Mode enabled
) else (
    echo ❌ Failed to enable CEP Development Mode
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
echo 🚀 Quick Access:    http://localhost:8206/dev-access.html
echo.
echo ========================================
echo 📋 Instructions:
echo ========================================
echo.
echo 1. Open your browser
echo 2. Go to: http://localhost:8206/dev-access.html (Quick Access)
echo 3. Or go to: http://localhost:8206/test-connection.html
echo 4. If successful, open: http://localhost:8206/index.html
echo 5. For CEP Console: http://localhost:9222
echo.
echo Press Ctrl+C to stop the server
echo.

python -m http.server 8206

pause
