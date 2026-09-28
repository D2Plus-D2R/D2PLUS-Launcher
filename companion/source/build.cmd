@echo off
setlocal
cd /d "%~dp0"
rem Run from an x64 Native Tools Command Prompt for Visual Studio 2022.
where cl >nul 2>nul
if errorlevel 1 (
 echo Open an x64 Native Tools Command Prompt for VS 2022 first.
 exit /b 1
)
rc /nologo /fo SuiteResources.res SuiteResources.rc
if errorlevel 1 exit /b 1
cl /nologo /std:c++17 /O2 /EHsc /DUNICODE /D_UNICODE *.cpp SuiteResources.res /Fe:..\D2PLUSDamageNumbers.exe /link /SUBSYSTEM:WINDOWS bcrypt.lib dwmapi.lib psapi.lib winmm.lib comctl32.lib gdi32.lib shell32.lib user32.lib advapi32.lib
if errorlevel 1 exit /b 1
node ..\..\scripts\stamp-companion.cjs "VS 2022 local rebuild; Windows runtime testing not recorded"
