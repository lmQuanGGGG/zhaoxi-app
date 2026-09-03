@echo off
cd /d "%~dp0.."
call npm run build:all
pause
