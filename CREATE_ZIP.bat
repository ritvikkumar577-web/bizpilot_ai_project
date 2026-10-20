@echo off
title BizPilot AI - Zip Generator
echo =======================================================
echo          CREATING BIZPILOT AI ZIP ARCHIVE 📦
echo =======================================================
echo.
echo Packaging entire BizPilot AI project into bizpilot-ai.zip ...

powershell -Command "Compress-Archive -Path '%~dp0*' -DestinationPath '%~dp0..\bizpilot-ai.zip' -Force"

if exist "%~dp0..\bizpilot-ai.zip" (
    echo.
    echo =======================================================
    echo  SUCCESS! Zip file created successfully at:
    echo  %~dp0..\bizpilot-ai.zip
    echo =======================================================
    echo.
    echo Opening folder containing your download...
    explorer /select,"%~dp0..\bizpilot-ai.zip"
) else (
    echo Error creating zip file.
)

pause
