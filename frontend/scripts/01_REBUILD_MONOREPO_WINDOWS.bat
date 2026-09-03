@echo off
setlocal
cd /d "%~dp0.."
echo [1/5] Cleaning old files...
call npm run clean
if exist package-lock.json del /f /q package-lock.json

echo [2/5] Installing all workspaces...
call npm install
if errorlevel 1 goto :error

echo [3/5] Verifying workspace...
call npm run verify:workspace
if errorlevel 1 goto :error

echo [4/5] Type checking all apps...
call npm run typecheck:all
if errorlevel 1 goto :error

echo [5/5] Building all apps...
call npm run build:all
if errorlevel 1 goto :error

echo.
echo SUCCESS: All three apps passed.
pause
exit /b 0
:error
echo.
echo FAILED. Review the error above.
pause
exit /b 1
