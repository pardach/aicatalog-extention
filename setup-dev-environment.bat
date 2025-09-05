@echo off
echo ========================================
echo 🔧 Setting Up Complete Development Environment
echo ========================================
echo.

cd /d "%~dp0"

echo This script will set up everything needed for development:
echo - Enable CEP Development Mode
echo - Configure Registry Settings
echo - Start Local Development Server
echo - Open Development Access Page
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul

echo.
echo [1/6] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed!
    echo.
    echo Please install Python from: https://python.org
    echo Or download the installer from python.org
    echo.
    pause
    exit /b 1
)
echo ✅ Python found

echo.
echo [2/6] Enabling CEP Development Mode...
reg add "HKCU\Software\Adobe\CSXS.11" /v "PlayerDebugMode" /t REG_SZ /d "1" /f >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ CEP Development Mode enabled
) else (
    echo ⚠️  Could not set CEP Development Mode (may require admin rights)
)

echo.
echo [3/6] Setting up logging and debugging...
reg add "HKCU\Software\Adobe\CSXS.11" /v "LogLevel" /t REG_SZ /d "0" /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.11" /v "PlayerDebugMode" /t REG_SZ /d "1" /f >nul 2>&1

echo.
echo [4/6] Checking for required files...
if exist "index.html" (
    echo ✅ Main extension file found
) else (
    echo ❌ index.html not found!
    pause
    exit /b 1
)

if exist ".debug" (
    echo ✅ Debug configuration found
) else (
    echo ❌ .debug file not found!
    pause
    exit /b 1
)

if exist "CSXS\manifest.xml" (
    echo ✅ Extension manifest found
) else (
    echo ❌ manifest.xml not found!
    pause
    exit /b 1
)

echo.
echo [5/6] Starting development server...
start /B python -m http.server 8206 >nul 2>&1
timeout /t 2 /nobreak >nul

echo.
echo [6/6] Opening development environment...
start http://localhost:8206/dev-access.html
timeout /t 1 /nobreak >nul
start http://localhost:9222

echo.
echo ========================================
echo 🎉 Development Environment Setup Complete!
echo ========================================
echo.
echo 🌐 Your development environment is ready:
echo.
echo 📱 Main Access Page: http://localhost:8206/dev-access.html
echo 🛠️ Chrome DevTools:   http://localhost:9222
echo 📄 Extension:        http://localhost:8206/index.html
echo 🎨 CEP Extension:    cep://com.yourcompany.newextension.panel/
echo.
echo 📋 What to do next:
echo 1. Wait for pages to load
echo 2. Open Illustrator
echo 3. Go to Window → Extensions
echo 4. Select "مدیریت کاتالوگ طرح‌های وکتوری"
echo 5. Use the 🐛 button for debug panel
echo 6. Use the 🧪 button for tests
echo.
echo 🔧 Debug Tools Available:
echo - Real-time logging
echo - Performance monitoring
echo - Error tracking
echo - Chrome DevTools integration
echo.
echo 📚 Documentation:
echo - DEV-MODE-README.md: Complete development guide
echo - DEBUG.md: Debug and troubleshooting
echo - QUICK-START.md: Quick start guide
echo.
echo Press any key to close this window...
echo The development server will continue running in the background.
echo.
pause >nul
