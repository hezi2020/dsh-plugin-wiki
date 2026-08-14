@echo off
rem DSH 插件市场 · 立即更新索引（双击运行，无需等待每 2 小时定时）
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0update-registry.ps1"
echo.
pause
