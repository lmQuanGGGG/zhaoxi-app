@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo [1/2] Cài đặt dependencies cho 3 ứng dụng...
call npm run install:all
if errorlevel 1 goto error
echo [2/2] Build toàn bộ...
call npm run build:all
if errorlevel 1 goto error
echo.
echo HOÀN THÀNH SPRINT 10.
pause
exit /b 0
:error
echo.
echo Có lỗi. Xem phần log phía trên.
pause
exit /b 1
