Unicode true
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"
!ifndef PAYLOAD
!error "Pass /DPAYLOAD=absolute application directory"
!endif
!ifndef OUTFILE
!error "Pass /DOUTFILE=absolute setup exe path"
!endif
Name "D2PLUS Launcher"
OutFile "${OUTFILE}"
InstallDir "$LOCALAPPDATA\Programs\D2PLUS Launcher"
RequestExecutionLevel user
SetCompressor /SOLID lzma
SetCompressorDictSize 32
VIProductVersion "0.7.0.0"
VIAddVersionKey /LANG=1033 "ProductName" "D2PLUS Launcher Setup"
VIAddVersionKey /LANG=1033 "FileDescription" "D2PLUS Launcher Alpha v0.7 Installer"
VIAddVersionKey /LANG=1033 "FileVersion" "0.7.0.0"
VIAddVersionKey /LANG=1033 "LegalCopyright" "D2PLUS contributors"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Welcome to D2PLUS Launcher"
!define MUI_WELCOMEPAGE_TEXT "Install the D2PLUS desktop launcher, offline wiki, hero editor and optional damage companion.$\r$\n$\r$\nGame files and character saves are not installed, moved or deleted. Your existing D2RMM options are preserved.$\r$\n$\r$\nDestination: your Windows user's local Programs folder. Close any running D2PLUS Launcher before continuing."
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\D2PLUS Launcher.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Open D2PLUS Launcher"
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"
Function .onInit
 ${IfNot} ${RunningX64}
 MessageBox MB_ICONSTOP "This build requires 64-bit Windows."
 Abort
 ${EndIf}
 SetRegView 64
 FindWindow $0 "" "D2PLUS Launcher"
 ${If} $0 != 0
 MessageBox MB_ICONEXCLAMATION "Close D2PLUS Launcher, then run this installer again."
 Abort
 ${EndIf}
FunctionEnd
Section "D2PLUS Launcher"
 SetShellVarContext current
 SetOutPath "$INSTDIR"
 File /r "${PAYLOAD}/*"
 WriteUninstaller "$INSTDIR\Uninstall D2PLUS Launcher.exe"
 CreateDirectory "$SMPROGRAMS\D2PLUS"
 CreateShortcut "$SMPROGRAMS\D2PLUS\D2PLUS Launcher.lnk" "$INSTDIR\D2PLUS Launcher.exe"
 CreateShortcut "$DESKTOP\D2PLUS Launcher.lnk" "$INSTDIR\D2PLUS Launcher.exe"
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\D2PLUSLauncher" "DisplayName" "D2PLUS Launcher"
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\D2PLUSLauncher" "DisplayVersion" "0.7.0-alpha"
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\D2PLUSLauncher" "Publisher" "D2PLUS"
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\D2PLUSLauncher" "InstallLocation" "$INSTDIR"
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\D2PLUSLauncher" "UninstallString" '$\"$INSTDIR\Uninstall D2PLUS Launcher.exe$\"'
 WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\D2PLUSLauncher" "NoModify" 1
 WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\D2PLUSLauncher" "NoRepair" 1
SectionEnd
Function un.onInit
 SetRegView 64
 FindWindow $0 "" "D2PLUS Launcher"
 ${If} $0 != 0
 MessageBox MB_ICONEXCLAMATION "Close D2PLUS Launcher before uninstalling."
 Abort
 ${EndIf}
FunctionEnd
Section "Uninstall"
 SetShellVarContext current
 ; Only package-listed files are removed. No recursive directory deletion.
 !include "uninstall-files.nsh"
 Delete "$INSTDIR\Uninstall D2PLUS Launcher.exe"
 RMDir "$INSTDIR"
 Delete "$DESKTOP\D2PLUS Launcher.lnk"
 Delete "$SMPROGRAMS\D2PLUS\D2PLUS Launcher.lnk"
 RMDir "$SMPROGRAMS\D2PLUS"
 DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\D2PLUSLauncher"
SectionEnd
