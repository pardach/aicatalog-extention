@echo off
echo ========================================
echo Enabling CEP Development Mode
echo ========================================
echo.

:: تنظیم CEP Development Mode
echo Setting CEP PlayerDebugMode...
reg add "HKCU\Software\Adobe\CSXS.11" /v "PlayerDebugMode" /t REG_SZ /d "1" /f >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ CEP Development Mode enabled
) else (
    echo ❌ Failed to set CEP Development Mode
)

:: تنظیم ExtendScript Debugger
echo Setting ExtendScript Debug Mode...
reg add "HKCU\Software\Adobe\Adobe Illustrator 2023\Support Files\Contents\Windows" /v "ESDebugger" /t REG_SZ /d "1" /f >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ ExtendScript Debug Mode enabled
) else (
    echo ⚠️  ExtendScript Debug Mode may not be set (this is normal for some versions)
)

:: تنظیمات پیشرفته برای debug
echo Setting advanced debug options...
reg add "HKCU\Software\Adobe\CSXS.11" /v "LogLevel" /t REG_SZ /d "0" /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.11" /v "PlayerDebugMode" /t REG_SZ /d "1" /f >nul 2>&1

:: تنظیمات اضافی برای debug
echo Setting additional debug options...
reg add "HKCU\Software\Adobe\CSXS.11" /v "LogLevel" /t REG_SZ /d "6" /f >nul 2>&1

echo.
echo ========================================
echo 🎉 Development Mode Enabled!
echo ========================================
echo.
echo 🌐 Chrome DevTools Access:
echo http://localhost:9222
echo.
echo 📱 CEP Extension:
echo cep://com.yourcompany.newextension.panel/
echo.
echo 🔧 ExtendScript Console:
echo - Open Illustrator
echo - Go to Window > Utilities > ExtendScript Toolkit
echo.
echo Press any key to continue...
pause >nul
