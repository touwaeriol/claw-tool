; ──────────────────────────────────────────────────────────
; Claw-Tool NSIS 安装脚本模板
;
; 占位符（由 make-installer.mjs 替换）：
;   {{APP_NAME}}     — 应用名称
;   {{APP_VERSION}}  — 版本号
;   {{ARCH}}         — 架构 (x64 / arm64)
;   {{SOURCE_DIR}}   — nw-builder 输出目录（绝对路径）
;   {{OUTPUT_FILE}}  — 安装包输出路径（绝对路径）
;   {{ICON_FILE}}    — .ico 图标路径（绝对路径）
; ──────────────────────────────────────────────────────────

!include "MUI2.nsh"
!include "FileFunc.nsh"

; ─── 基本信息 ─────────────────────────────────────────────
Name "{{APP_NAME}}"
OutFile "{{OUTPUT_FILE}}"
InstallDir "$PROGRAMFILES64\{{APP_NAME}}"
InstallDirRegKey HKLM "Software\{{APP_NAME}}" "InstallDir"
RequestExecutionLevel admin
Unicode True

; ─── 图标 ─────────────────────────────────────────────────
!define MUI_ICON "{{ICON_FILE}}"
!define MUI_UNICON "{{ICON_FILE}}"

; ─── 版本信息 ─────────────────────────────────────────────
VIProductVersion "{{APP_VERSION}}.0"
VIAddVersionKey "ProductName" "{{APP_NAME}}"
VIAddVersionKey "ProductVersion" "{{APP_VERSION}}"
VIAddVersionKey "FileVersion" "{{APP_VERSION}}"
VIAddVersionKey "FileDescription" "{{APP_NAME}} 安装程序"
VIAddVersionKey "LegalCopyright" "MIT License"

; ─── MUI 页面 ─────────────────────────────────────────────
!define MUI_ABORTWARNING

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; 卸载页面
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; ─── 语言 ─────────────────────────────────────────────────
!insertmacro MUI_LANGUAGE "SimpChinese"
!insertmacro MUI_LANGUAGE "English"

; ─── 安装段 ─────────────────────────────────────────────
Section "主程序" SecMain
  SectionIn RO

  ; 设置安装目录
  SetOutPath "$INSTDIR"

  ; 复制所有文件
  File /r "{{SOURCE_DIR}}\*.*"

  ; 写入卸载信息到注册表
  WriteRegStr HKLM "Software\{{APP_NAME}}" "InstallDir" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\{{APP_NAME}}" \
    "DisplayName" "{{APP_NAME}}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\{{APP_NAME}}" \
    "UninstallString" "$\"$INSTDIR\uninstall.exe$\""
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\{{APP_NAME}}" \
    "DisplayIcon" "$INSTDIR\claw-tool.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\{{APP_NAME}}" \
    "DisplayVersion" "{{APP_VERSION}}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\{{APP_NAME}}" \
    "Publisher" "Claw-Tool"

  ; 计算安装大小
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\{{APP_NAME}}" \
    "EstimatedSize" "$0"

  ; 创建卸载程序
  WriteUninstaller "$INSTDIR\uninstall.exe"

  ; 创建开始菜单快捷方式
  CreateDirectory "$SMPROGRAMS\{{APP_NAME}}"
  CreateShortCut "$SMPROGRAMS\{{APP_NAME}}\{{APP_NAME}}.lnk" "$INSTDIR\claw-tool.exe"
  CreateShortCut "$SMPROGRAMS\{{APP_NAME}}\卸载 {{APP_NAME}}.lnk" "$INSTDIR\uninstall.exe"

  ; 创建桌面快捷方式
  CreateShortCut "$DESKTOP\{{APP_NAME}}.lnk" "$INSTDIR\claw-tool.exe"
SectionEnd

; ─── 卸载段 ─────────────────────────────────────────────
Section "Uninstall"
  ; 删除安装目录下的所有文件
  RMDir /r "$INSTDIR"

  ; 删除快捷方式
  Delete "$DESKTOP\{{APP_NAME}}.lnk"
  RMDir /r "$SMPROGRAMS\{{APP_NAME}}"

  ; 删除注册表项
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\{{APP_NAME}}"
  DeleteRegKey HKLM "Software\{{APP_NAME}}"
SectionEnd
