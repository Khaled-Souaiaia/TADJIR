@echo off
chcp 65001 > nul
title DzPOS Pro - تجميع وبناء ملف التثبيت Setup.exe
echo ========================================================
echo   DzPOS Pro - Construction du fichier Setup.exe
echo   بناء وتجميع برنامج التثبيت لنظام Windows
echo ========================================================
echo.

echo [1/3] التحقق من الحزم والمكتبات...
if not exist node_modules (
    call npm install
)

echo [2/3] بناء ملفات الواجهة للإنتاج...
call npm run build

echo [3/3] تجميع الحزمة عبر Electron Builder و NSIS...
call npx electron-builder --win nsis

echo.
echo ========================================================
echo   تم بنجاح! ستجد ملف التثبيت داخل مجلد: dist-electron/
echo   Fichier généré dans : dist-electron/DzPOS-Pro-Setup-1.0.0.exe
echo ========================================================
pause
