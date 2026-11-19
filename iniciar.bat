@echo off
title Cuco - Controle de escalas
cd /d "%~dp0"
echo.
echo  Iniciando Cuco em http://localhost:3000
echo.
node --no-warnings=ExperimentalWarning server/index.js
pause
