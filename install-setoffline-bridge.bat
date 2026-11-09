@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "ROOT=%~dp0"
set "CEP=%APPDATA%\Adobe\CEP\extensions"
set "OLD=%CEP%\new-illustrator-extension"
set "DIRECT=%CEP%\ir.pardach.directuploader"
echo Installing legacy catalog and Setoffline upload bridge...
if not exist "%CEP%" mkdir "%CEP%"
if not exist "%OLD%" mkdir "%OLD%"
if not exist "%DIRECT%" mkdir "%DIRECT%"

rem Keep the old extension ID and installation path so local settings persist.
rem Do not /MIR or delete the previous folder.
robocopy "%ROOT%" "%OLD%" /E /XD "%ROOT%direct-uploader" "%ROOT%.git" /NFL /NDL /NJH /NJS /NP >nul
if %ERRORLEVEL% GEQ 8 (
    echo ERROR: could not update the original Vector Catalog panel.
    exit /b 1
)
robocopy "%ROOT%direct-uploader" "%DIRECT%" /E /NFL /NDL /NJH /NJS /NP >nul
if %ERRORLEVEL% GEQ 8 (
    echo ERROR: could not install Setoffline Direct Uploader.
    exit /b 1
)
echo.
echo Installed:
echo    %OLD%
echo    %DIRECT%
echo.
echo Restart Adobe Illustrator.
echo Open the original Vector Catalog panel and click "Send to Setoffline".
echo Development build: unsigned CEP extensions require appropriate developer
echo settings for your Illustrator CSXS version. Production requires signed ZXP.
endlocal
