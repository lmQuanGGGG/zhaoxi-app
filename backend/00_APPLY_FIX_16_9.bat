@echo off
setlocal
cd /d "%~dp0"
echo ==============================================
echo ZhaoXi Backend Sprint 16.9 CLEAN FIX
echo ==============================================

if not exist package.json (
  echo [ERROR] package.json not found. Extract this patch into the kuai-dao-backend root folder.
  pause
  exit /b 1
)

if exist "lib\services\release-audit-service.ts" (
  echo [CLEAN] Removing obsolete lib\services\release-audit-service.ts
  del /f /q "lib\services\release-audit-service.ts"
)

if exist ".next" (
  echo [CLEAN] Removing old .next cache
  rmdir /s /q ".next"
)
if exist "tsconfig.tsbuildinfo" del /f /q "tsconfig.tsbuildinfo"

echo [CHECK] Sprint 16.9 structure...
call npm run verify:16.9
if errorlevel 1 goto :fail

echo [CHECK] TypeScript...
call npm run typecheck
if errorlevel 1 goto :fail

echo [BUILD] Next.js...
call npm run build
if errorlevel 1 goto :fail

echo.
echo [OK] Backend Sprint 16.9 clean fix passed typecheck and build.
pause
exit /b 0

:fail
echo.
echo [FAILED] See the error above. Do not run npm audit fix --force.
pause
exit /b 1
