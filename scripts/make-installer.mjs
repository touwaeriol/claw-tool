#!/usr/bin/env node

/**
 * Claw-Tool 安装包生成脚本
 *
 * 在 nw-builder 打包完成后运行，将 release/ 中的散装文件
 * 打包成平台原生安装包：
 *   - Windows: WiX MSI 安装包
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
  unlinkSync,
} from 'fs'
import { randomUUID } from 'crypto'

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

// ─── Windows 安装包（WiX MSI） ───────────────────────────

// 固定 UpgradeCode，确保后续版本能正确升级
const UPGRADE_CODE = 'e8a3b2c1-4d5f-6a7b-8c9d-0e1f2a3b4c5d'

/**
 * 在常见路径中查找 WiX Toolset v3.x 的 bin 目录
 */
function findWixBin() {
  // CI 环境（GitHub Actions windows-latest）预装路径
  const candidates = [
    'C:\\Program Files (x86)\\WiX Toolset v3.14\\bin',
    'C:\\Program Files (x86)\\WiX Toolset v3.11\\bin',
  ]

  for (const dir of candidates) {
    if (existsSync(resolve(dir, 'candle.exe'))) {
      return dir
    }
  }

  // 尝试 PATH 中是否有 candle
  try {
    runCapture('where candle.exe')
    return null // null 表示已在 PATH 中，不需要前缀
  } catch {
    return null
  }
}

function makeWindowsInstaller(arch) {
  step(`生成 Windows ${arch} MSI 安装包 (WiX)`)

  const sourceDir = resolve(RELEASE_DIR, `windows-${arch}`)
  if (!existsSync(sourceDir)) {
    console.log(`  跳过：${sourceDir} 不存在`)
    return null
  }

  ensureDir(INSTALLER_DIR)

  const outputFile = resolve(
    INSTALLER_DIR,
    `claw-tool-${APP_VERSION}-win-${arch}.msi`,
  )

  // 查找 WiX 工具路径
  const wixBin = findWixBin()
  const wixPrefix = wixBin ? `"${wixBin}\\` : '"'
  const candle = `${wixPrefix}candle.exe"`
  const light = `${wixPrefix}light.exe"`
  const heat = `${wixPrefix}heat.exe"`

  // 确定主可执行文件名
  const exeName = 'claw-tool.exe'

  // 临时文件路径
  const tmpDir = resolve(BUILD_DIR, '_wix_tmp')
  ensureDir(tmpDir)
  const heatWxs = resolve(tmpDir, 'files.wxs')
  const mainWxs = resolve(tmpDir, 'main.wxs')
  const heatObj = resolve(tmpDir, 'files.wixobj')
  const mainObj = resolve(tmpDir, 'main.wixobj')

  try {
    // 1. 用 heat.exe 收集源目录中的所有文件
    console.log('  [1/4] heat.exe: 收集文件清单...')
    run(
      `${heat} dir "${sourceDir}"` +
      ` -nologo -ag -srd -sfrag -sreg` +
      ` -cg AppFiles -dr INSTALLFOLDER` +
      ` -var var.SourceDir` +
      ` -out "${heatWxs}"`,
    )

    // 2. 读取模板并替换占位符
    console.log('  [2/4] 生成主 WXS...')
    const template = readFileSync(resolve(BUILD_DIR, 'installer.wxs'), 'utf-8')
    const productCode = randomUUID().toUpperCase()
    const wxsContent = template
      .replace(/\{\{APP_NAME\}\}/g, APP_NAME)
      .replace(/\{\{APP_VERSION\}\}/g, APP_VERSION)
      .replace(/\{\{UPGRADE_CODE\}\}/g, UPGRADE_CODE)
      .replace(/\{\{PRODUCT_CODE\}\}/g, productCode)
      .replace(/\{\{EXE_NAME\}\}/g, exeName)

    writeFileSync(mainWxs, wxsContent, 'utf-8')

    // 3. candle.exe 编译
    console.log('  [3/4] candle.exe: 编译 WiX 源文件...')
    run(
      `${candle} -nologo -arch x64` +
      ` -dSourceDir="${sourceDir}"` +
      ` -out "${tmpDir}\\\\"` +
      ` "${mainWxs}" "${heatWxs}"`,
    )

    // 4. light.exe 链接生成 MSI
    console.log('  [4/4] light.exe: 链接生成 MSI...')
    run(
      `${light} -nologo` +
      ` -ext WixUIExtension` +
      ` -out "${outputFile}"` +
      ` "${mainObj}" "${heatObj}"`,
    )

    console.log(`  MSI 安装包已生成: ${outputFile}`)

    // 清理临时文件
    for (const f of [heatWxs, mainWxs, heatObj, mainObj]) {
      try { unlinkSync(f) } catch { /* ignore */ }
    }
    // 清理 light 生成的 wixpdb
    const pdbFile = outputFile.replace(/\.msi$/, '.wixpdb')
    try { unlinkSync(pdbFile) } catch { /* ignore */ }

    return outputFile
  } catch (err) {
    console.error(`  MSI 生成失败: ${err.message}`)
    console.error('  请确保 WiX Toolset v3.x 已安装')
    console.error('  CI 环境 (GitHub Actions windows-latest) 已预装 WiX')
    console.error('  本地安装: https://wixtoolset.org/releases/')
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
