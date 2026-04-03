@echo off
chcp 65001 >nul

:: Lê a versão atual do sw.js
for /f "tokens=2 delims=-v\"" %%a in ('findstr /i "CACHE_NAME" sw.js') do set VER=%%a

:: Incrementa o número
set /a NEWVER=%VER% + 1

:: Substitui no sw.js
powershell -Command "(Get-Content sw.js) -replace 'bfmidi-wifi-v%VER%', 'bfmidi-wifi-v%NEWVER%' | Set-Content sw.js"

echo.
echo  Versao atualizada: v%VER% ^> v%NEWVER%
echo.

:: Git
git add .
git commit -m "deploy v%NEWVER%"
git push

echo.
echo  Publicado! Aguarde ~1 minuto e o app atualiza sozinho.
echo.
pause
