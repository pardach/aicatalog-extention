@echo off
chcp 65001 >nul
echo ========================================
echo اکستنشن جدید - حذف خودکار
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
set "EXTENSION_PATH=%CEP_PATH%\new-illustrator-extension"

echo 📁 بررسی مسیر نصب: %EXTENSION_PATH%

if exist "%EXTENSION_PATH%" (
    echo 🗑️ حذف افزونه...
    rmdir /s /q "%EXTENSION_PATH%"
    if %errorLevel% == 0 (
        echo ✅ افزونه با موفقیت حذف شد
    ) else (
        echo ❌ خطا در حذف افزونه
        pause
        exit /b 1
    )
) else (
    echo ℹ️ افزونه در مسیر %EXTENSION_PATH% یافت نشد
)

:: حذف تنظیمات Registry (اختیاری)
echo.
set /p "REMOVE_REGISTRY=آیا تنظیمات Registry نیز حذف شوند؟ (y/n): "
if /i "%REMOVE_REGISTRY%"=="y" (
    echo 🔧 حذف تنظیمات Registry...
    reg delete "HKCU\Software\Adobe\CSXS.11" /v "PlayerDebugMode" /f >nul 2>&1
    reg delete "HKCU\Software\Adobe\CSXS.11" /v "LogLevel" /f >nul 2>&1
    echo ✅ تنظیمات Registry حذف شدند
)

echo.
echo ========================================
echo 🎉 حذف با موفقیت انجام شد!
echo ========================================
echo.
echo 📋 مراحل بعدی:
echo 1. Adobe Illustrator را restart کنید
echo 2. اگر افزونه هنوز نمایش داده می‌شود، Illustrator را کاملاً ببندید و دوباره باز کنید
echo.
echo 📁 مسیر حذف شده: %EXTENSION_PATH%
echo.
pause
