@echo off
chcp 65001 >nul
title 多媒体互动教材平台
color 0A
echo ==========================================
echo   多媒体互动教材平台
echo ==========================================
echo.
cd /d "%~dp0"
echo 正在启动服务器...
echo.
node server\index.js
pause
