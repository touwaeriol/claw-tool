#!/usr/bin/env node

/**
 * Claw-Tool 安装包生成脚本
 *
 * 在 nw-builder 打包完成后运行，将 release/ 中的散装文件
 * 打包成平台原生安装包：
 *   - Windows: NSIS .exe 安装包
 *   - macOS:   .dmg 磁盘映像
 *
 * 用法：
 *   node scripts/make-installer.mjs                              # 处理当前平台
 *   node scripts/make-installer.mjs --platform win --arch x64    # 指定目标
 *   node scripts/make-installer.mjs --all                        # 所有已构建目标
 */

import { execSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  renameSync,
} from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const RELEASE_DIR = resolve(ROOT, 'release')
const BUILD_DIR = resolve(ROOT, 'build')
const INSTALLER_DIR = resolve(ROOT, 'release', 'installers')

// ─── 读取项目信息 ─────────────────────────────────────────

const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'))
const APP_NAME = 'Claw Tool'
const APP_VERSION = pkg.version

// ─── 参数解析 ─────────────────────────────────────────────

const argv = process.argv.slice(2)

function hasFlag(name) {
  return argv.includes(`--${name}`)
}

function getFlagValue(name) {
  const idx = argv.indexOf(`--${name}`)
  return idx !== -1 && idx + 1 < argv.length ? argv[idx + 1] : null
}

// ─── 工具函数 ─────────────────────────────────────────────

function step(msg) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`  ${msg}`)
  console.log('─'.repeat(60))
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function run(cmd, options = {}) {
  console.log(`  > ${cmd}`)
  return execSync(cmd, { cwd: ROOT, stdio: 'inherit', ...options })
}

function runCapture(cmd, options = {}) {
  console.log(`  > ${cmd}`)
  return execSync(cmd, { cwd: ROOT, encoding: 'utf-8', ...options }).trim()
}

// ─── Windows 安装包（NSIS） ───────────────────────────────

function makeWindowsInstaller(arch) {
  step(`生成 Windows ${arch} 安装包 (NSIS)`)

  const sourceDir = resolve(RELEASE_DIR, `windows-${arch}`)
  if (!existsSync(sourceDir)) {
    console.log(`  跳过：${sourceDir} 不存在`)
    return null
  }

  ensureDir(INSTALLER_DIR)

  const outputFile = resolve(
    INSTALLER_DIR,
    `claw-tool-${APP_VERSION}-win-${arch}-setup.exe`,
  )

  // 确定图标路径
  const icoPath = resolve(BUILD_DIR, 'icons', 'icon.ico')
  const fallbackIco = resolve(ROOT, 'assets', 'logo.png')
  const iconFile = existsSync(icoPath) ? icoPath : fallbackIco

  // 读取 NSIS 模板并替换占位符
  const template = readFileSync(
    resolve(BUILD_DIR, 'installer.nsi'),
    'utf-8',
  )

  const nsiContent = template
    .replace(/\{\{APP_NAME\}\}/g, APP_NAME)
    .replace(/\{\{APP_VERSION\}\}/g, APP_VERSION)
    .replace(/\{\{ARCH\}\}/g, arch)
    .replace(/\{\{SOURCE_DIR\}\}/g, sourceDir.replace(/\//g, '\\'))
    .replace(/\{\{OUTPUT_FILE\}\}/g, outputFile.replace(/\//g, '\\'))
    .replace(/\{\{ICON_FILE\}\}/g, iconFile.replace(/\//g, '\\'))

  // 写入临时 .nsi 文件
  const tmpNsi = resolve(BUILD_DIR, `installer-${arch}.nsi`)
  writeFileSync(tmpNsi, nsiContent, 'utf-8')

  // 调用 makensis
  try {
    run(`makensis "${tmpNsi}"`)
    console.log(`  安装包已生成: ${outputFile}`)
    return outputFile
  } catch (err) {
    console.error(`  NSIS 编译失败: ${err.message}`)
    console.error('  请确保 NSIS 已安装并在 PATH 中')
    console.error('  安装方法: choco install nsis 或从 https://nsis.sourceforge.io 下载')
    return null
  }
}

// ─── macOS DMG ─────────────────────────────────────────────

function makeMacDmg(arch) {
  step(`生成 macOS ${arch} DMG`)

  const sourceDir = resolve(RELEASE_DIR, `macos-${arch}`)
  if (!existsSync(sourceDir)) {
    console.log(`  跳过：${sourceDir} 不存在`)
    return null
  }

  ensureDir(INSTALLER_DIR)

  const outputFile = resolve(
    INSTALLER_DIR,
    `claw-tool-${APP_VERSION}-mac-${arch}.dmg`,
  )

  // 查找 .app 包
  const appBundle = findAppBundle(sourceDir)
  if (!appBundle) {
    console.error(`  错误：在 ${sourceDir} 中未找到 .app 包`)
    return null
  }

  // 使用 create-dmg 命令行工具（macOS 内置或通过 brew 安装）
  try {
    // 先尝试 create-dmg (brew install create-dmg)
    run(
      `create-dmg` +
      ` --volname "${APP_NAME}"` +
      ` --window-pos 200 120` +
      ` --window-size 540 380` +
      ` --icon-size 80` +
      ` --icon "${APP_NAME}.app" 140 200` +
      ` --app-drop-link 400 200` +
      ` --no-internet-enable` +
      ` "${outputFile}"` +
      ` "${appBundle}"`,
    )
    console.log(`  DMG 已生成: ${outputFile}`)
    return outputFile
  } catch {
    console.log('  create-dmg 失败，尝试使用 hdiutil...')
  }

  // 回退方案：使用 macOS 原生 hdiutil
  try {
    // 创建临时目录用于 dmg 内容
    const tmpDmgDir = resolve(RELEASE_DIR, '_dmg_tmp')
    ensureDir(tmpDmgDir)
    run(`cp -R "${appBundle}" "${tmpDmgDir}/"`)
    run(`ln -sf /Applications "${tmpDmgDir}/Applications"`)

    run(
      `hdiutil create -volname "${APP_NAME}"` +
      ` -srcfolder "${tmpDmgDir}"` +
      ` -ov -format UDZO` +
      ` "${outputFile}"`,
    )

    // 清理临时目录
    run(`rm -rf "${tmpDmgDir}"`)

    console.log(`  DMG 已生成: ${outputFile}`)
    return outputFile
  } catch (err) {
    console.error(`  DMG 生成失败: ${err.message}`)
    return null
  }
}

/**
 * 在目录中查找 .app 包
 */
function findAppBundle(dir) {
  try {
    const entries = readdirSync(dir)
    const app = entries.find(e => e.endsWith('.app'))
    return app ? resolve(dir, app) : null
  } catch {
    return null
  }
}

// ─── 主流程 ───────────────────────────────────────────────

function main() {
  console.log(`\nClaw-Tool v${APP_VERSION} 安装包生成脚本`)
  console.log(`输出目录: ${INSTALLER_DIR}`)

  const results = []

  if (hasFlag('all')) {
    // 构建所有已存在的目标
    results.push(makeWindowsInstaller('x64'))
    results.push(makeWindowsInstaller('arm64'))
    results.push(makeMacDmg('arm64'))
  } else {
    const platform = getFlagValue('platform')
    const arch = getFlagValue('arch') || 'x64'

    if (platform === 'win') {
      results.push(makeWindowsInstaller(arch))
    } else if (platform === 'osx' || platform === 'mac') {
      results.push(makeMacDmg(arch))
    } else {
      // 自动检测平台
      if (process.platform === 'win32') {
        results.push(makeWindowsInstaller(process.arch === 'arm64' ? 'arm64' : 'x64'))
      } else if (process.platform === 'darwin') {
        results.push(makeMacDmg('arm64'))
      } else {
        console.error('不支持的平台，请使用 --platform 指定')
        process.exit(1)
      }
    }
  }

  const successful = results.filter(Boolean)
  console.log(`\n完成！成功生成 ${successful.length} 个安装包`)
  if (successful.length > 0) {
    console.log('生成的安装包:')
    successful.forEach(f => console.log(`  - ${f}`))
  }
}

main()
