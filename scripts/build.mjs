#!/usr/bin/env node

/**
 * Claw-Tool 跨平台构建脚本
 *
 * 用法：
 *   node scripts/build.mjs                              # 构建当前平台
 *   node scripts/build.mjs --platform win --arch x64    # 指定平台
 *   node scripts/build.mjs --platform osx --arch arm64  # macOS ARM64
 *   node scripts/build.mjs --all                        # 构建所有目标
 *   node scripts/build.mjs --vite-only                  # 仅 Vite 构建（不打包）
 *
 * 构建流程：
 *   1. Vite 构建渲染进程 (Vue 3 应用) → dist/
 *   2. 复制主进程 + shared 代码到 dist/
 *   3. 生成 dist/package.json（NW.js manifest）
 *   4. 安装运行时依赖到 dist/
 *   5. 复制图标资源到 dist/
 *   6. nw-builder 打包为各平台可执行文件 → release/
 */

import { execSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  existsSync,
  mkdirSync,
  cpSync,
  readFileSync,
  writeFileSync,
  rmSync,
  readdirSync,
} from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ─── 常量 ─────────────────────────────────────────────

/** NW.js 版本 — 与 devDependencies 中的 nw 包版本保持一致 */
const NW_VERSION = '0.96.0'

/** 内嵌 Node.js 版本 */
const EMBEDDED_NODE_VERSION = '22.22.1'

/** 源图标路径 */
const ICON_SRC = resolve(ROOT, '.image', 'claw-tool-icon.png')

/** 构建目标定义（NW.js 目前不支持 Windows ARM64） */
const BUILD_TARGETS = [
  { platform: 'win', arch: 'x64', label: 'Windows x64' },
  { platform: 'osx', arch: 'arm64', label: 'macOS ARM64 (Apple Silicon)' },
]

const DIST_DIR = resolve(ROOT, 'dist')
const RELEASE_DIR = resolve(ROOT, 'release')

// ─── 参数解析 ─────────────────────────────────────────

const argv = process.argv.slice(2)

function hasFlag(name) {
  return argv.includes(`--${name}`)
}

function getFlagValue(name) {
  const idx = argv.indexOf(`--${name}`)
  return idx !== -1 && idx + 1 < argv.length ? argv[idx + 1] : null
}

function resolveTargets() {
  if (hasFlag('all')) {
    return BUILD_TARGETS
  }

  const platform = getFlagValue('platform')
  const arch = getFlagValue('arch')

  if (platform && arch) {
    const target = BUILD_TARGETS.find(t => t.platform === platform && t.arch === arch)
    if (!target) {
      console.error(`错误：不支持的构建目标 ${platform}-${arch}`)
      console.error('支持的目标：', BUILD_TARGETS.map(t => `${t.platform}-${t.arch}`).join(', '))
      process.exit(1)
    }
    return [target]
  }

  // 自动检测当前平台
  const currentPlatform = process.platform === 'darwin' ? 'osx' : 'win'
  const currentArch = process.arch === 'arm64' ? 'arm64' : 'x64'
  const target = BUILD_TARGETS.find(t => t.platform === currentPlatform && t.arch === currentArch)
  return [target || BUILD_TARGETS[0]]
}

// ─── 工具函数 ─────────────────────────────────────────

function step(msg) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  ${msg}`)
  console.log('='.repeat(60))
}

function run(cmd, options = {}) {
  console.log(`  > ${cmd}`)
  execSync(cmd, { cwd: ROOT, stdio: 'inherit', ...options })
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function copyDir(src, dest, label) {
  if (!existsSync(src)) {
    console.log(`  跳过（不存在）: ${label}`)
    return
  }
  ensureDir(dest)
  cpSync(src, dest, { recursive: true })
  console.log(`  已复制: ${label}`)
}

// ─── 构建步骤 ─────────────────────────────────────────

/**
 * 步骤 1: Vite 构建渲染进程
 */
function buildRenderer() {
  step('步骤 1/5: Vite 构建渲染进程')
  run('npx vite build')
}

/**
 * 步骤 2: 复制主进程和共享代码
 */
function copyMainProcess() {
  step('步骤 2/5: 复制主进程和共享代码')

  copyDir(
    resolve(ROOT, 'src', 'main'),
    resolve(DIST_DIR, 'main'),
    'src/main/ → dist/main/',
  )

  copyDir(
    resolve(ROOT, 'src', 'shared'),
    resolve(DIST_DIR, 'shared'),
    'src/shared/ → dist/shared/',
  )

  // executor 和 instances 模块（如果存在）
  copyDir(
    resolve(ROOT, 'src', 'executor'),
    resolve(DIST_DIR, 'executor'),
    'src/executor/ → dist/executor/',
  )

  copyDir(
    resolve(ROOT, 'src', 'instances'),
    resolve(DIST_DIR, 'instances'),
    'src/instances/ → dist/instances/',
  )
}

/**
 * 步骤 3: 生成 dist/package.json 并复制图标
 */
async function generateDistManifest() {
  step('步骤 3/5: 生成 NW.js manifest 和图标')

  const srcPkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'))

  // 复制图标到 dist
  const distIconDir = resolve(DIST_DIR, 'icons')
  ensureDir(distIconDir)

  if (existsSync(ICON_SRC)) {
    cpSync(ICON_SRC, resolve(distIconDir, 'icon.png'))
    console.log('  已复制图标: .image/claw-tool-icon.png → dist/icons/icon.png')
  } else {
    console.warn('  警告：未找到图标文件 .image/claw-tool-icon.png')
  }

  // 自动从 PNG 生成 .ico（如果 build/icons/icon.ico 不存在）
  const buildIconsDir = resolve(ROOT, 'build', 'icons')
  const icoPath = resolve(buildIconsDir, 'icon.ico')
  if (!existsSync(icoPath) && existsSync(ICON_SRC)) {
    try {
      const pngToIco = (await import('png-to-ico')).default
      const icoBuf = await pngToIco(ICON_SRC)
      ensureDir(buildIconsDir)
      writeFileSync(icoPath, icoBuf)
      console.log('  已从 PNG 生成: build/icons/icon.ico')
    } catch (err) {
      console.warn(`  警告：生成 .ico 失败: ${err.message}`)
    }
  }

  // 复制平台特定图标（如果存在）
  if (existsSync(buildIconsDir)) {
    for (const file of ['icon.ico', 'icon.icns']) {
      const src = resolve(buildIconsDir, file)
      if (existsSync(src)) {
        cpSync(src, resolve(distIconDir, file))
        console.log(`  已复制图标: build/icons/${file} → dist/icons/${file}`)
      }
    }
  }

  // 生成 NW.js 打包用的 package.json
  const distPkg = {
    name: srcPkg.name,
    version: srcPkg.version,
    description: srcPkg.description,
    main: 'index.html',
    'node-main': 'main/index.js',
    window: {
      title: 'Claw Tool',
      width: 1200,
      height: 800,
      min_width: 900,
      min_height: 600,
      icon: 'icons/icon.png',
    },
    'chromium-args': srcPkg['chromium-args'] || '--mixed-context',
    dependencies: srcPkg.dependencies || {},
  }

  writeFileSync(
    resolve(DIST_DIR, 'package.json'),
    JSON.stringify(distPkg, null, 2),
    'utf-8',
  )
  console.log('  已生成: dist/package.json')
}

/**
 * 步骤 4: 安装运行时依赖
 */
function installDeps() {
  step('步骤 4/5: 安装运行时依赖')
  run('npm install --omit=dev', { cwd: DIST_DIR })
}

/**
 * 步骤 5: nw-builder 打包（使用 JS API 以支持 macOS app 配置）
 */
async function packTarget(target) {
  step(`步骤 5/5: 打包 ${target.label}`)

  const platformLabel = target.platform === 'win' ? 'windows' : 'macos'
  const outDir = resolve(RELEASE_DIR, `${platformLabel}-${target.arch}`)

  ensureDir(RELEASE_DIR)

  // 清理旧的输出
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true })
  }

  // 读取版本号
  const distPkg = JSON.parse(readFileSync(resolve(DIST_DIR, 'package.json'), 'utf-8'))

  const nwbuildOptions = {
    mode: 'build',
    platform: target.platform,
    arch: target.arch,
    version: NW_VERSION,
    flavor: 'normal',
    outDir: outDir,
    glob: false,
    srcDir: DIST_DIR,
    app: {
      // name 决定可执行文件名：Windows → claw-tool.exe, macOS → claw-tool.app
      // macOS 显示名用 CFBundleDisplayName 控制
      name: 'claw-tool',
      icon: resolve(DIST_DIR, 'icons', 'icon.png'),
      LSApplicationCategoryType: 'public.app-category.developer-tools',
      CFBundleIdentifier: 'com.clawtool.app',
      CFBundleDisplayName: 'Claw Tool',
      CFBundleName: 'Claw Tool',
      CFBundleSpokenName: 'Claw Tool',
      CFBundleVersion: distPkg.version || '0.1.0',
      CFBundleShortVersionString: distPkg.version || '0.1.0',
      NSHumanReadableCopyright: `Copyright © 2024-2026 Claw Tool. MIT License.`,
      NSLocalNetworkUsageDescription: 'Claw Tool needs local network access to communicate with OpenClaw gateway.',
    },
  }

  // 动态导入 nw-builder
  const nwbuild = (await import('nw-builder')).default
  await nwbuild(nwbuildOptions)

  console.log(`\n  打包完成: release/${platformLabel}-${target.arch}/`)
}

// ─── 内嵌 Node.js Portable ────────────────────────────

/**
 * 步骤 6: 下载并嵌入 Node.js Portable 到打包输出目录
 */
async function embedNodePortable(target) {
  step(`步骤 6: 嵌入 Node.js v${EMBEDDED_NODE_VERSION} Portable`)

  const platformLabel = target.platform === 'win' ? 'windows' : 'macos'
  const outDir = resolve(RELEASE_DIR, `${platformLabel}-${target.arch}`)

  // 确定下载 URL 和文件名
  let archiveFile, archiveName, nodeSubDir
  if (target.platform === 'win') {
    archiveName = `node-v${EMBEDDED_NODE_VERSION}-win-${target.arch}.zip`
    nodeSubDir = `node-v${EMBEDDED_NODE_VERSION}-win-${target.arch}`
  } else {
    archiveName = `node-v${EMBEDDED_NODE_VERSION}-darwin-${target.arch}.tar.gz`
    nodeSubDir = `node-v${EMBEDDED_NODE_VERSION}-darwin-${target.arch}`
  }

  const nodeUrl = `https://nodejs.org/dist/v${EMBEDDED_NODE_VERSION}/${archiveName}`
  const cacheDir = resolve(ROOT, 'build', '_node_cache')
  ensureDir(cacheDir)
  archiveFile = resolve(cacheDir, archiveName)

  // 下载（有缓存则跳过）
  if (existsSync(archiveFile)) {
    console.log(`  已缓存: ${archiveName}`)
  } else {
    console.log(`  下载: ${nodeUrl}`)
    run(`node -e "
      const https = require('https');
      const fs = require('fs');
      function download(url, dest) {
        return new Promise((resolve, reject) => {
          const file = fs.createWriteStream(dest);
          https.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              file.close();
              fs.unlinkSync(dest);
              download(res.headers.location, dest).then(resolve).catch(reject);
              return;
            }
            if (res.statusCode !== 200) {
              file.close();
              reject(new Error('HTTP ' + res.statusCode));
              return;
            }
            const total = parseInt(res.headers['content-length'] || '0', 10);
            let downloaded = 0;
            res.on('data', (chunk) => {
              downloaded += chunk.length;
              const pct = total > 0 ? Math.round(downloaded / total * 100) : 0;
              process.stdout.write('\\r  下载进度: ' + pct + '%');
            });
            res.pipe(file);
            file.on('finish', () => { file.close(); console.log(''); resolve(); });
          }).on('error', (err) => { file.close(); reject(err); });
        });
      }
      download('${nodeUrl}', '${archiveFile.replace(/\\/g, '/')}').catch(err => { console.error(err); process.exit(1); });
    "`)
  }

  // 解压到临时目录
  const extractDir = resolve(cacheDir, '_extract')
  if (existsSync(extractDir)) {
    rmSync(extractDir, { recursive: true })
  }
  ensureDir(extractDir)

  console.log('  解压中...')
  if (target.platform === 'win') {
    run(`tar -xf "${archiveFile}" -C "${extractDir}"`)
  } else {
    run(`tar -xzf "${archiveFile}" -C "${extractDir}"`)
  }

  // 复制到输出目录
  const extractedNodeDir = resolve(extractDir, nodeSubDir)
  let destNodeDir

  if (target.platform === 'win') {
    destNodeDir = resolve(outDir, 'node')
  } else {
    // macOS: .app/Contents/Resources/node/
    const appBundle = findAppBundle(outDir)
    if (appBundle) {
      destNodeDir = resolve(appBundle, 'Contents', 'Resources', 'node')
    } else {
      destNodeDir = resolve(outDir, 'node')
    }
  }

  if (existsSync(destNodeDir)) {
    rmSync(destNodeDir, { recursive: true })
  }

  console.log(`  复制到: ${destNodeDir}`)
  cpSync(extractedNodeDir, destNodeDir, { recursive: true })

  // 清理解压临时目录
  rmSync(extractDir, { recursive: true })

  // 验证
  const nodeExe = target.platform === 'win'
    ? resolve(destNodeDir, 'node.exe')
    : resolve(destNodeDir, 'bin', 'node')

  if (existsSync(nodeExe)) {
    console.log(`  Node.js v${EMBEDDED_NODE_VERSION} 已嵌入`)
  } else {
    throw new Error(`Node.js 嵌入失败: ${nodeExe} 不存在`)
  }
}

/**
 * 在 release 目录中查找 .app 包（macOS）
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

// ─── 主流程 ───────────────────────────────────────────

async function main() {
  const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'))
  const viteOnly = hasFlag('vite-only')
  const targets = viteOnly ? [] : resolveTargets()

  console.log(`\nClaw-Tool v${pkg.version} 构建脚本`)
  if (viteOnly) {
    console.log('模式: 仅 Vite 构建')
  } else {
    console.log(`目标: ${targets.map(t => t.label).join(', ')}`)
  }

  const startTime = Date.now()

  // 步骤 1: Vite 构建
  buildRenderer()

  // 步骤 2: 复制主进程
  copyMainProcess()

  // 步骤 3: 生成 manifest + 图标
  await generateDistManifest()

  if (!viteOnly) {
    // 步骤 4: 安装依赖
    installDeps()

    // 步骤 5: 逐个平台打包 + 步骤 6: 嵌入 Node.js
    for (const target of targets) {
      await packTarget(target)
      await embedNodePortable(target)
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n构建完成！耗时 ${elapsed}s`)

  if (!viteOnly) {
    console.log(`输出目录: ${RELEASE_DIR}`)
  }
}

main().catch(err => {
  console.error('\n构建失败:', err.message || err)
  process.exit(1)
})
