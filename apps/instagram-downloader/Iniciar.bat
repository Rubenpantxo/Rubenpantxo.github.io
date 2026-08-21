@echo off
chcp 65001 >nul
title Instagram Downloader - servidor local
cd /d "%~dp0"

echo.
echo   Instagram Downloader
echo   ====================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo   [X] Falta Node.js. Instalalo desde https://nodejs.org y vuelve a ejecutar este archivo.
    echo.
    pause
    exit /b 1
)

python -m yt_dlp --version >nul 2>&1
if errorlevel 1 (
    echo   Instalando yt-dlp (solo la primera vez)...
    python -m pip install --upgrade yt-dlp
    echo.
)

echo   Abriendo http://localhost:8787 en el navegador...
start "" http://localhost:8787
echo.

node server.js

echo.
echo   El servidor se ha detenido.
pause
