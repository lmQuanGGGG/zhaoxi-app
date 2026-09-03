@echo off
setlocal
cd /d "%~dp0.."
for %%A in (customer partner admin) do (
  if exist "apps\%%A\.next" rmdir /s /q "apps\%%A\.next"
  if exist "apps\%%A\node_modules" rmdir /s /q "apps\%%A\node_modules"
)
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /f /q package-lock.json
npm install
if errorlevel 1 exit /b 1
npm run build:all
pause
