@echo off
title OTICA LINCE - Servidor Web & Gestao
color 0C
echo =======================================================
echo          OTICA LINCE - SISTEMA COMPLETO ONLINE
echo =======================================================
echo.
echo  [1] No Computador (Local):
echo      Site:   http://localhost:3000
echo      Painel: http://localhost:3000/admin
echo.
echo  [2] No Celular (Conectado no mesmo Wi-Fi):
echo      Site:   http://192.168.2.136:3000
echo      Painel: http://192.168.2.136:3000/admin
echo.
echo =======================================================
set "PATH=C:\Program Files\nodejs;%PATH%"
node server.js
pause
