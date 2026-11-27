@echo off
setlocal
echo Studio Set Catalog - unsigned development installer
echo Enables PlayerDebugMode for CEP 9, 10, 11 and 12 for this Windows user.
choice /C YN /N /M "Continue? [Y/N] "
if errorlevel 2 exit /b 1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" -EnableUnsigned
set "RESULT=%ERRORLEVEL%"
pause
exit /b %RESULT%
