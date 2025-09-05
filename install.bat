@echo off
chcp 65001 >nul
echo ========================================
echo اکستنشن جدید - نصب خودکار
echo ========================================
echo.

:: بررسی دسترسی Administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo ✅ دسترسی Administrator تایید شد
) else (
    echo ❌ این اسکریپت نیاز به دسترسی Administrator دارد
    echo لطفاً روی فایل راست کلیک کرده و "Run as administrator" را انتخاب کنید
    pause
    exit /b 1
)

:: پیدا کردن مسیر CEP Extensions
set "CEP_PATH=%APPDATA%\Adobe\CEP\extensions"
if not exist "%CEP_PATH%" (
    echo 📁 ایجاد پوشه CEP Extensions...
    mkdir "%CEP_PATH%"
)

:: کپی فایل‌های افزونه
echo 📁 کپی فایل‌های افزونه...
if exist "%CEP_PATH%\new-illustrator-extension" (
    echo 🗑️ حذف نسخه قبلی...
    rmdir /s /q "%CEP_PATH%\new-illustrator-extension"
)

xcopy "%~dp0*" "%CEP_PATH%\new-illustrator-extension\" /e /i /y >nul
if %errorLevel% == 0 (
    echo ✅ فایل‌ها با موفقیت کپی شدند
) else (
    echo ❌ خطا در کپی فایل‌ها
    pause
    exit /b 1
)

:: تنظیم Developer Mode در Registry
echo 🔧 تنظیم Developer Mode...
reg add "HKCU\Software\Adobe\CSXS.11" /v "PlayerDebugMode" /t REG_SZ /d "1" /f >nul 2>&1
if %errorLevel% == 0 (
    echo ✅ Developer Mode فعال شد
) else (
    echo ⚠️ خطا در تنظیم Developer Mode (ممکن است نیاز به تنظیم دستی داشته باشید)
)

:: تنظیم CEP Debug Mode
reg add "HKCU\Software\Adobe\CSXS.11" /v "PlayerDebugMode" /t REG_SZ /d "1" /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.11" /v "LogLevel" /t REG_SZ /d "6" /f >nul 2>&1

echo.
echo ========================================
echo 🎉 نصب با موفقیت انجام شد!
echo ========================================
echo.
echo 📋 مراحل بعدی:
echo 1. Adobe Illustrator را باز کنید
echo 2. به منوی Window > Extensions بروید
echo 3. "اکستنشن جدید" را انتخاب کنید
echo.
echo 🔧 در صورت مشکل:
echo - Illustrator را restart کنید
echo - Developer Mode را بررسی کنید
echo.
echo 📁 مسیر نصب: %CEP_PATH%\new-illustrator-extension
echo.
pause
