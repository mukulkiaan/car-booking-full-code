@echo off
title SafarSetu - Build Android APK
color 0E
echo ========================================================
echo        SafarSetu Android APK Builder (Expo EAS)
echo ========================================================
echo.
echo [1/2] Checking Expo Login status...
call npx eas-cli whoami >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Aap Expo me logged in nahi hain.
    echo Kripya apna Expo Email aur Password enter karein:
    echo (Agar account nahi hai toh free me expo.dev par register karein)
    echo.
    call npx eas-cli login
) else (
    echo Expo Login: SUCCESS!
)

echo.
echo ========================================================
echo [2/2] Starting Android APK Build on Expo Cloud...
echo ========================================================
echo.
echo Note: Cloud par build me lagbhag 5-10 minute lagte hain.
echo Build complete hone ke baad direct .APK Download Link aur QR Code mil jayega!
echo.
call npx eas-cli build -p android --profile preview

echo.
echo ========================================================
echo               Build Process Complete!
echo ========================================================
pause
