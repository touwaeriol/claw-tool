#!/usr/bin/env node

/**
 * 清理构建产物（dist/ 和 release/）
 */

import { rmSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

for (const dir of ['dist', 'release']) {
  rmSync(resolve(ROOT, dir), { recursive: true, force: true })
  console.log(`已清理: ${dir}/`)
}
