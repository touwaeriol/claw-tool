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
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { randomUUID } from 'crypto'
import { PNG } from 'pngjs'

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

// ─── BMP 生成（安装界面图片） ────────────────────────────

/**
 * 双线性插值缩放 RGBA 像素数据
 */
function bilinearResize(src, srcW, srcH, dstW, dstH) {
  const dst = Buffer.alloc(dstW * dstH * 4)
  const xRatio = srcW / dstW
  const yRatio = srcH / dstH

  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const srcX = x * xRatio
      const srcY = y * yRatio
      const x1 = Math.floor(srcX)
      const y1 = Math.floor(srcY)
      const x2 = Math.min(x1 + 1, srcW - 1)
      const y2 = Math.min(y1 + 1, srcH - 1)
      const xFrac = srcX - x1
      const yFrac = srcY - y1

      const dstIdx = (y * dstW + x) * 4
      for (let c = 0; c < 4; c++) {
        const v1 = src[(y1 * srcW + x1) * 4 + c]
        const v2 = src[(y1 * srcW + x2) * 4 + c]
        const v3 = src[(y2 * srcW + x1) * 4 + c]
        const v4 = src[(y2 * srcW + x2) * 4 + c]
        dst[dstIdx + c] = Math.round(
          v1 * (1 - xFrac) * (1 - yFrac) +
            v2 * xFrac * (1 - yFrac) +
            v3 * (1 - xFrac) * yFrac +
            v4 * xFrac * yFrac,
        )
      }
    }
  }
  return dst
}

/**
 * 将 RGBA 像素合成到白色背景上
 */
function compositeOnWhite(bgW, bgH, icon, iconW, iconH, offsetX, offsetY) {
  // 初始化白色背景 (RGBA)
  const result = Buffer.alloc(bgW * bgH * 4, 255)

  for (let y = 0; y < iconH; y++) {
    for (let x = 0; x < iconW; x++) {
      const dstX = x + offsetX
      const dstY = y + offsetY
      if (dstX < 0 || dstX >= bgW || dstY < 0 || dstY >= bgH) continue

      const srcIdx = (y * iconW + x) * 4
      const dstIdx = (dstY * bgW + dstX) * 4
      const alpha = icon[srcIdx + 3] / 255

      result[dstIdx] = Math.round(icon[srcIdx] * alpha + 255 * (1 - alpha))
      result[dstIdx + 1] = Math.round(icon[srcIdx + 1] * alpha + 255 * (1 - alpha))
      result[dstIdx + 2] = Math.round(icon[srcIdx + 2] * alpha + 255 * (1 - alpha))
      result[dstIdx + 3] = 255
    }
  }
  return result
}

/**
 * 将 RGBA 像素数据编码为 24-bit BMP 文件
 */
function encodeBmp(width, height, rgbaPixels) {
  const rowSize = Math.ceil((width * 3) / 4) * 4
  const pixelDataSize = rowSize * height
  const fileSize = 54 + pixelDataSize

  const buf = Buffer.alloc(fileSize)

  // File header (14 bytes)
  buf.write('BM', 0)
  buf.writeUInt32LE(fileSize, 2)
  buf.writeUInt32LE(0, 6)
  buf.writeUInt32LE(54, 10)

  // Info header (40 bytes) - BITMAPINFOHEADER
  buf.writeUInt32LE(40, 14)
  buf.writeInt32LE(width, 18)
  buf.writeInt32LE(height, 22) // positive = bottom-up
  buf.writeUInt16LE(1, 26)
  buf.writeUInt16LE(24, 28) // 24-bit
  buf.writeUInt32LE(0, 30) // no compression
  buf.writeUInt32LE(pixelDataSize, 34)
  buf.writeInt32LE(2835, 38) // 72 DPI
  buf.writeInt32LE(2835, 42)
  buf.writeUInt32LE(0, 46)
  buf.writeUInt32LE(0, 50)

  // Pixel data (bottom-to-top, BGR)
  for (let y = height - 1; y >= 0; y--) {
    const rowStart = 54 + (height - 1 - y) * rowSize
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4
      const dstIdx = rowStart + x * 3
      buf[dstIdx] = rgbaPixels[srcIdx + 2] // B
      buf[dstIdx + 1] = rgbaPixels[srcIdx + 1] // G
      buf[dstIdx + 2] = rgbaPixels[srcIdx] // R
    }
  }

  return buf
}

/**
 * 从应用图标 PNG 生成 WiX 安装界面 BMP 图片
 * @param {string} iconPngPath - PNG 图标路径
 * @param {string} outputDir - BMP 输出目录
 * @returns {{ dialogBmp: string, bannerBmp: string } | null}
 */
function generateInstallerBitmaps(iconPngPath, outputDir) {
  if (!iconPngPath || !existsSync(iconPngPath)) {
    console.warn('  警告：未找到 PNG 图标，安装界面将使用默认图片')
    return null
  }

  try {
    const pngData = readFileSync(iconPngPath)
    const icon = PNG.sync.read(pngData)

    // Dialog bitmap: 493x312 (Welcome/Completion 页面左侧大图)
    // 图标放在可见区域中央（左侧约 200px 可见）
    const dlgW = 493
    const dlgH = 312
    const dlgIconSize = 160
    const resizedDlg = bilinearResize(icon.data, icon.width, icon.height, dlgIconSize, dlgIconSize)
    const dlgOffsetX = Math.floor(100 - dlgIconSize / 2) // 居中在左侧可见区 (~200px)
    const dlgOffsetY = Math.floor((dlgH - dlgIconSize) / 2)
    const dlgPixels = compositeOnWhite(
      dlgW,
      dlgH,
      resizedDlg,
      dlgIconSize,
      dlgIconSize,
      dlgOffsetX,
      dlgOffsetY,
    )
    const dialogBmpPath = resolve(outputDir, 'dialog.bmp')
    writeFileSync(dialogBmpPath, encodeBmp(dlgW, dlgH, dlgPixels))

    // Banner bitmap: 493x58 (其他页面顶部横幅)
    // 图标放在右侧
    const bnrW = 493
    const bnrH = 58
    const bnrIconSize = 44
    const resizedBnr = bilinearResize(icon.data, icon.width, icon.height, bnrIconSize, bnrIconSize)
    const bnrOffsetX = bnrW - bnrIconSize - 8
    const bnrOffsetY = Math.floor((bnrH - bnrIconSize) / 2)
    const bnrPixels = compositeOnWhite(
      bnrW,
      bnrH,
      resizedBnr,
      bnrIconSize,
      bnrIconSize,
      bnrOffsetX,
      bnrOffsetY,
    )
    const bannerBmpPath = resolve(outputDir, 'banner.bmp')
    writeFileSync(bannerBmpPath, encodeBmp(bnrW, bnrH, bnrPixels))

    console.log('  已生成安装界面图片: dialog.bmp, banner.bmp')
    return { dialogBmp: dialogBmpPath, bannerBmp: bannerBmpPath }
  } catch (err) {
    console.warn(`  警告：生成安装界面图片失败: ${err.message}`)
    return null
  }
}

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

  const outputFile = resolve(INSTALLER_DIR, `claw-tool-${APP_VERSION}-win-${arch}.msi`)

  // 查找 WiX 工具路径
  const wixBin = findWixBin()
  const wixPrefix = wixBin ? `"${wixBin}\\` : '"'
  const candle = `${wixPrefix}candle.exe"`
  const light = `${wixPrefix}light.exe"`
  const heat = `${wixPrefix}heat.exe"`

  // 确定主可执行文件名（nw-builder 使用 app.name "claw-tool"）
  const exeName = 'claw-tool.exe'

  // 查找 .ico 图标文件
  const icoPath = resolve(BUILD_DIR, 'icons', 'icon.ico')
  const icoInSource = resolve(sourceDir, 'icons', 'icon.ico')
  const iconFile = existsSync(icoPath) ? icoPath : existsSync(icoInSource) ? icoInSource : null
  if (!iconFile) {
    console.warn('  警告：未找到 .ico 图标文件，安装包将使用默认图标')
  }

  // 生成安装界面 BMP 图片
  const iconPng = resolve(ROOT, '.image', 'claw-tool-icon.png')
  const bitmaps = generateInstallerBitmaps(iconPng, tmpDir)

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

    // 1.5 将 heat 生成的随机 Guid 替换为 "*"（确定性 GUID）
    // heat -ag 生成的随机 GUID 导致每次构建所有组件 GUID 不同，
    // MSI 在升级时无法识别未变更的组件，costing 阶段极慢。
    // Guid="*" 让 WiX 根据组件路径计算稳定的 GUID，升级时可复用。
    const heatContent = readFileSync(heatWxs, 'utf-8')
    const stableContent = heatContent.replace(
      /Guid="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"/g,
      'Guid="*"',
    )
    writeFileSync(heatWxs, stableContent, 'utf-8')
    console.log('  已将组件 GUID 替换为确定性模式 (Guid="*")')

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
      .replace(/\{\{ICON_FILE\}\}/g, iconFile ? iconFile.replace(/\//g, '\\') : '')
      .replace(/\{\{DIALOG_BMP\}\}/g, bitmaps ? bitmaps.dialogBmp.replace(/\//g, '\\') : '')
      .replace(/\{\{BANNER_BMP\}\}/g, bitmaps ? bitmaps.bannerBmp.replace(/\//g, '\\') : '')

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
    const tmpFiles = [heatWxs, mainWxs, heatObj, mainObj]
    if (bitmaps) {
      tmpFiles.push(bitmaps.dialogBmp, bitmaps.bannerBmp)
    }
    for (const f of tmpFiles) {
      try {
        unlinkSync(f)
      } catch {
        /* ignore */
      }
    }
    // 清理 light 生成的 wixpdb
    const pdbFile = outputFile.replace(/\.msi$/, '.wixpdb')
    try {
      unlinkSync(pdbFile)
    } catch {
      /* ignore */
    }

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

  const outputFile = resolve(INSTALLER_DIR, `claw-tool-${APP_VERSION}-mac-${arch}.dmg`)

  // 查找 .app 包
  const appBundle = findAppBundle(sourceDir)
  if (!appBundle) {
    console.error(`  错误：在 ${sourceDir} 中未找到 .app 包`)
    return null
  }

  // 获取 .app 文件名（如 "claw-tool.app"）
  const appBundleName = appBundle.split('/').pop().split('\\').pop()

  // 使用 create-dmg 命令行工具（macOS 内置或通过 brew 安装）
  try {
    // 先尝试 create-dmg (brew install create-dmg)
    run(
      `create-dmg` +
        ` --volname "${APP_NAME}"` +
        ` --window-pos 200 120` +
        ` --window-size 540 380` +
        ` --icon-size 80` +
        ` --icon "${appBundleName}" 140 200` +
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
    const app = entries.find((e) => e.endsWith('.app'))
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
    successful.forEach((f) => console.log(`  - ${f}`))
  }
}

main()
