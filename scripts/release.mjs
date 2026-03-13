#!/usr/bin/env node

/**
 * Claw-Tool 版本发布脚本
 *
 * 用法：
 *   node scripts/release.mjs patch    # 0.1.0 → 0.1.1
 *   node scripts/release.mjs minor    # 0.1.0 → 0.2.0
 *   node scripts/release.mjs major    # 0.1.0 → 1.0.0
 *
 * 流程：
 *   1. 检查 git 工作区是否干净
 *   2. 更新 package.json 中的 version
 *   3. git commit -m "release: vX.Y.Z"
 *   4. git tag vX.Y.Z
 *   5. git push && git push --tags
 *
 * 推送 tag 后，GitHub Actions 会自动构建并发布 Release。
 */

import { execSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync, writeFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ─── 工具函数 ─────────────────────────────────────────────

function run(cmd) {
  console.log(`  > ${cmd}`)
  return execSync(cmd, { cwd: ROOT, encoding: 'utf-8' }).trim()
}

function runSilent(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf-8' }).trim()
}

// ─── 版本号操作 ───────────────────────────────────────────

function bumpVersion(current, type) {
  const parts = current.split('.').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`无效的版本号: ${current}`)
  }

  switch (type) {
    case 'major':
      return `${parts[0] + 1}.0.0`
    case 'minor':
      return `${parts[0]}.${parts[1] + 1}.0`
    case 'patch':
      return `${parts[0]}.${parts[1]}.${parts[2] + 1}`
    default:
      throw new Error(`无效的版本类型: ${type}，支持 patch/minor/major`)
  }
}

// ─── 主流程 ───────────────────────────────────────────────

function main() {
  const type = process.argv[2]
  if (!type || !['patch', 'minor', 'major'].includes(type)) {
    console.error('用法: node scripts/release.mjs <patch|minor|major>')
    process.exit(1)
  }

  // 检查 git 工作区
  const status = runSilent('git status --porcelain')
  if (status) {
    console.error('错误：git 工作区不干净，请先提交或暂存更改')
    console.error(status)
    process.exit(1)
  }

  // 读取当前版本
  const pkgPath = resolve(ROOT, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  const oldVersion = pkg.version
  const newVersion = bumpVersion(oldVersion, type)

  console.log(`\n版本升级: ${oldVersion} → ${newVersion} (${type})\n`)

  // 更新 package.json
  pkg.version = newVersion
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
  console.log('已更新 package.json')

  // git commit
  run(`git add package.json`)
  run(`git commit -m "release: v${newVersion}"`)

  // git tag
  run(`git tag -a v${newVersion} -m "v${newVersion}"`)
  console.log(`已创建 tag: v${newVersion}`)

  // push
  run('git push')
  run('git push --tags')

  console.log(`\n发布完成！v${newVersion}`)
  console.log('GitHub Actions 将自动构建安装包并创建 Release。')
}

main()
