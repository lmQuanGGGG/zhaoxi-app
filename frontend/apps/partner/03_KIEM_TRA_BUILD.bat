@echo off
cd /d "%~dp0"
echo [1/3] Cai dat thu vien...
call npm install
if errorlevel 1 goto :error
echo [2/3] Kiem tra TypeScript...
call npm run typecheck
if errorlevel 1 goto :error
echo [3/3] Build Next.js...
call npm run build
if errorlevel 1 goto :error
echo.
echo BUILD THANH CONG.
pause
exit /b 0
:error
echo.
echo BUILD THAT BAI. Hay chup phan loi va gui lai.
pause
exit /b 1
