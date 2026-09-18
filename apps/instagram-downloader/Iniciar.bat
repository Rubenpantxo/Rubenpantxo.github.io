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

set "PY="
py -3 --version >nul 2>&1 && set "PY=py -3"
if not defined PY ( python --version >nul 2>&1 && set "PY=python" )
if not defined PY (
    echo   [X] Falta Python. Instalalo desde https://www.python.org/downloads/
    echo       IMPORTANTE: marca la casilla "Add python.exe to PATH" al instalarlo.
    echo.
    pause
    exit /b 1
)

%PY% -m yt_dlp --version >nul 2>&1
if errorlevel 1 (
    echo   Instalando yt-dlp (solo la primera vez)...
    %PY% -m pip install --upgrade yt-dlp
    echo.
) else (
    echo   Actualizando yt-dlp...
    %PY% -m pip install --quiet --upgrade yt-dlp
    echo.
)

echo   Arrancando el servidor en http://localhost:8787
echo   (deja esta ventana abierta mientras descargas)
echo.

start "" /b cmd /c "timeout /t 3 >nul & start "" http://localhost:8787"

node server.js

echo.
echo   El servidor se ha detenido.
pause
