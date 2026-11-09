@echo off
setlocal
set "SOURCE=%~dp0"
set "TARGET=%APPDATA%\Adobe\CEP\extensions\ir.pardach.directuploader"
echo Installing Pardach Direct Uploader...
if not exist "%APPDATA%\Adobe\CEP\extensions" mkdir "%APPDATA%\Adobe\CEP\extensions"
robocopy "%SOURCE%" "%TARGET%" /E /NFL /NDL /NJH /NJS /NP >nul
if %ERRORLEVEL% GEQ 8 (
  echo Installation failed. Check permissions.
  exit /b 1
)
echo Installed to: %TARGET%
echo Restart Illustrator and open Window - Extensions - Pardach Direct Uploader
echo Unsigned developer builds may require Adobe CEP developer mode.
endlocal
