/**
 * 技能管理器
 * 从 ClawHub 官方 API (clawhub.ai) 获取技能列表、详情，并支持一键安装/卸载
 * 通过 executor 抽象层支持本地和远程实例
 *
 * ClawHub API v1 端点：
 *   GET /api/v1/skills            — 技能列表（分页、排序）
 *   GET /api/v1/skills/:slug      — 技能详情
 *   GET /api/v1/search?q=...      — 搜索技能
 *   GET /api/v1/download?slug=... — 下载技能 zip
 */

const https = require('https')
const http = require('http')
const { URL } = require('url')
const { eventBus } = require('../shared/ipc')

// ClawHub 官方 API
const CLAWHUB_BASE = 'https://clawhub.ai'
const API_V1 = `${CLAWHUB_BASE}/api/v1`

// 技能事件
const SkillEvents = {
  INSTALL_PROGRESS: 'skill:install-progress',
  INSTALL_COMPLETE: 'skill:install-complete',
  INSTALL_ERROR: 'skill:install-error',
}

// 内存缓存
let skillListCache = null
let skillListCacheTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 分钟缓存

/**
 * 发起 HTTPS 请求（支持代理）
 * @param {string} url - 请求 URL
 * @param {object} [options] - 额外选项
 * @returns {Promise<{statusCode: number, data: string, headers: object}>}
 */
function httpGet(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'claw-tool',
        Accept: 'application/json',
        ...options.headers,
      },
      timeout: options.timeout || 15000,
    }

    // 支持代理
    let proxyUrl = null
    try {
      const proxyManager = require('./proxy-manager')
      proxyUrl = proxyManager.buildProxyUrl()
    } catch {
      // proxy-manager 不可用时忽略
    }

    if (proxyUrl) {
      const proxy = new URL(proxyUrl.replace('socks5://', 'http://'))
      reqOptions.hostname = proxy.hostname
      reqOptions.port = parseInt(proxy.port)
      reqOptions.path = url
      reqOptions.headers.Host = parsed.hostname
    }

    const req = (proxyUrl ? http : https).request(reqOptions, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, data, headers: res.headers })
      })
    })

    req.on('timeout', () => {
      req.destroy()
      reject(new Error('请求超时'))
    })

    req.on('error', (err) => reject(err))
    req.end()
  })
}

/**
 * 从 ClawHub 官方 API 获取技能列表
 * @param {object} [options] - 选项
 * @param {number} [options.limit] - 每页数量
 * @param {string} [options.cursor] - 分页游标
 * @param {string} [options.sort] - 排序方式: updated|downloads|stars|installs|trending
 * @returns {Promise<{items: Array, nextCursor: string|null}>}
 */
async function fetchSkillList(options = {}) {
  const { limit, cursor, sort } = options

  // 检查缓存（仅缓存默认首页请求）
  if (!cursor && !sort && skillListCache && Date.now() - skillListCacheTime < CACHE_TTL) {
    return skillListCache
  }

  try {
    const params = new URLSearchParams()
    if (limit) params.set('limit', String(limit))
    if (cursor) params.set('cursor', cursor)
    if (sort) params.set('sort', sort)

    const qs = params.toString()
    const url = `${API_V1}/skills${qs ? '?' + qs : ''}`
    const res = await httpGet(url)

    if (res.statusCode !== 200) {
      throw new Error(`ClawHub API 返回 ${res.statusCode}`)
    }

    const result = JSON.parse(res.data)

    // 标准化技能数据
    const normalized = {
      items: (result.items || []).map(normalizeSkill),
      nextCursor: result.nextCursor || null,
    }

    // 仅缓存默认首页
    if (!cursor && !sort) {
      skillListCache = normalized
      skillListCacheTime = Date.now()
    }

    return normalized
  } catch (err) {
    console.error('[技能管理器] 获取技能列表失败:', err.message)
    throw err
  }
}

/**
 * 搜索技能
 * @param {string} query - 搜索关键词
 * @param {object} [options] - 选项
 * @param {number} [options.limit] - 结果数量限制
 * @returns {Promise<Array>} 搜索结果
 */
async function searchSkills(query, options = {}) {
  if (!query || !query.trim()) return []

  try {
    const params = new URLSearchParams({ q: query.trim() })
    if (options.limit) params.set('limit', String(options.limit))

    const url = `${API_V1}/search?${params.toString()}`
    const res = await httpGet(url)

    if (res.statusCode !== 200) {
      throw new Error(`搜索 API 返回 ${res.statusCode}`)
    }

    const result = JSON.parse(res.data)
    return (result.results || []).map((item) => ({
      slug: item.slug,
      name: item.slug,
      displayName: item.displayName || item.slug,
      description: item.summary || '',
      version: item.version || '',
      updatedAt: item.updatedAt,
      score: item.score,
    }))
  } catch (err) {
    console.error('[技能管理器] 搜索失败:', err.message)
    return []
  }
}

/**
 * 标准化 ClawHub API 返回的技能数据
 * @param {object} item - API 返回的原始技能对象
 * @returns {object} 标准化后的技能对象
 */
function normalizeSkill(item) {
  // tags 是 { tagName: "version" } 格式，提取标签名
  const tags = item.tags ? Object.keys(item.tags) : []

  return {
    slug: item.slug,
    name: item.slug,
    displayName: item.displayName || item.slug,
    description: item.summary || '',
    tags,
    version: item.latestVersion?.version || '',
    changelog: item.latestVersion?.changelog || '',
    license: item.latestVersion?.license || null,
    stats: item.stats || {},
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    metadata: item.metadata || null,
    // 便于展示的字段
    downloads: item.stats?.downloads || 0,
    stars: item.stats?.stars || 0,
    installsCurrent: item.stats?.installsCurrent || 0,
  }
}

/**
 * 获取技能详情
 * @param {string} slug - 技能 slug
 * @returns {Promise<object>}
 */
async function fetchSkillDetail(slug) {
  try {
    const url = `${API_V1}/skills/${encodeURIComponent(slug)}`
    const res = await httpGet(url)

    if (res.statusCode === 404) {
      throw new Error(`技能 ${slug} 不存在`)
    }
    if (res.statusCode !== 200) {
      throw new Error(`ClawHub API 返回 ${res.statusCode}`)
    }

    const result = JSON.parse(res.data)
    const tags = result.skill?.tags ? Object.keys(result.skill.tags) : []

    return {
      slug: result.skill?.slug || slug,
      name: result.skill?.slug || slug,
      displayName: result.skill?.displayName || slug,
      description: result.skill?.summary || '',
      tags,
      stats: result.skill?.stats || {},
      createdAt: result.skill?.createdAt,
      updatedAt: result.skill?.updatedAt,
      version: result.latestVersion?.version || '',
      changelog: result.latestVersion?.changelog || '',
      license: result.latestVersion?.license || null,
      owner: result.owner || null,
      metadata: result.metadata || null,
      moderation: result.moderation || null,
    }
  } catch (err) {
    console.error(`[技能管理器] 获取技能详情失败 (${slug}):`, err.message)
    throw err
  }
}

/**
 * 安装技能到 OpenClaw 实例
 * 优先使用 openclaw skill install 命令，回退到手动下载
 * @param {string} slug - 技能 slug
 * @param {object} executor - 执行器实例
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function installSkill(slug, executor) {
  eventBus.emit(SkillEvents.INSTALL_PROGRESS, {
    skillName: slug,
    status: 'installing',
    message: `正在安装技能 ${slug}...`,
  })

  try {
    // 尝试使用 openclaw 内置的 skill install 命令
    const result = await executor.exec(`openclaw skill install ${slug}`, {
      timeout: 60000,
    })

    if (result.exitCode === 0) {
      eventBus.emit(SkillEvents.INSTALL_COMPLETE, { skillName: slug })
      return { success: true, message: `技能 ${slug} 安装成功` }
    }

    // 如果命令不支持，回退到手动方式
    if (result.stderr && result.stderr.includes('unknown command')) {
      return await installSkillManual(slug, executor)
    }

    throw new Error(result.stderr || `安装失败，退出码: ${result.exitCode}`)
  } catch (err) {
    // 命令不存在时回退到手动安装
    if (err.message && err.message.includes('not found')) {
      return await installSkillManual(slug, executor)
    }

    eventBus.emit(SkillEvents.INSTALL_ERROR, {
      skillName: slug,
      error: err.message,
    })
    return { success: false, message: `安装失败: ${err.message}` }
  }
}

/**
 * 手动安装技能（从 ClawHub 下载到 ~/.openclaw/skills/ 目录）
 * @param {string} slug - 技能 slug
 * @param {object} executor - 执行器实例
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function installSkillManual(slug, executor) {
  try {
    eventBus.emit(SkillEvents.INSTALL_PROGRESS, {
      skillName: slug,
      status: 'downloading',
      message: '正在从 ClawHub 下载技能...',
    })

    // 获取技能详情（包含 changelog 作为 README 内容）
    const detail = await fetchSkillDetail(slug)

    // 创建技能目录
    const homeDir = await executor.getHomeDir()
    const skillDir = `${homeDir}/.openclaw/skills/${slug}`

    await executor.exec(`mkdir -p "${skillDir}"`)

    // 构建 SKILL.md 内容
    const skillMd = buildSkillMd(detail)
    await executor.writeFile(`${skillDir}/SKILL.md`, skillMd)

    eventBus.emit(SkillEvents.INSTALL_COMPLETE, { skillName: slug })
    return { success: true, message: `技能 ${slug} 安装成功` }
  } catch (err) {
    eventBus.emit(SkillEvents.INSTALL_ERROR, {
      skillName: slug,
      error: err.message,
    })
    return { success: false, message: `安装失败: ${err.message}` }
  }
}

/**
 * 从技能详情构建 SKILL.md 内容
 * @param {object} detail - 技能详情
 * @returns {string}
 */
function buildSkillMd(detail) {
  let content = '---\n'
  content += `name: ${detail.slug}\n`
  if (detail.description) content += `description: "${detail.description}"\n`
  if (detail.version) content += `version: ${detail.version}\n`
  if (detail.tags && detail.tags.length) {
    content += `tags: [${detail.tags.join(', ')}]\n`
  }
  content += '---\n\n'

  if (detail.changelog) {
    content += detail.changelog
  }

  return content
}

/**
 * 卸载技能
 * @param {string} slug - 技能 slug
 * @param {object} executor - 执行器实例
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function uninstallSkill(slug, executor) {
  try {
    // 尝试 openclaw 内置命令
    const result = await executor.exec(`openclaw skill uninstall ${slug}`, {
      timeout: 30000,
    })

    if (result.exitCode === 0) {
      return { success: true, message: `技能 ${slug} 已卸载` }
    }

    // 回退到手动删除
    if (result.stderr && result.stderr.includes('unknown command')) {
      return await uninstallSkillManual(slug, executor)
    }

    throw new Error(result.stderr || `卸载失败，退出码: ${result.exitCode}`)
  } catch (err) {
    if (err.message && err.message.includes('not found')) {
      return await uninstallSkillManual(slug, executor)
    }
    return { success: false, message: `卸载失败: ${err.message}` }
  }
}

/**
 * 手动卸载技能（删除目录）
 */
async function uninstallSkillManual(slug, executor) {
  try {
    const homeDir = await executor.getHomeDir()
    const skillDir = `${homeDir}/.openclaw/skills/${slug}`

    const exists = await executor.exists(skillDir)
    if (!exists) {
      return { success: true, message: `技能 ${slug} 不存在` }
    }

    await executor.exec(`rm -rf "${skillDir}"`)
    return { success: true, message: `技能 ${slug} 已卸载` }
  } catch (err) {
    return { success: false, message: `卸载失败: ${err.message}` }
  }
}

/**
 * 获取已安装的技能列表
 * @param {object} executor - 执行器实例
 * @returns {Promise<string[]>} 已安装的技能 slug 列表
 */
async function getInstalledSkills(executor) {
  try {
    // 尝试 openclaw 内置命令
    const result = await executor.exec('openclaw skill list --json', {
      timeout: 10000,
    })

    if (result.exitCode === 0 && result.stdout.trim()) {
      try {
        const list = JSON.parse(result.stdout.trim())
        return Array.isArray(list) ? list.map((s) => (typeof s === 'string' ? s : s.name)) : []
      } catch {
        // JSON 解析失败，按行解析
        return result.stdout.trim().split('\n').filter(Boolean)
      }
    }

    // 回退：读取 ~/.openclaw/skills/ 目录
    return await getInstalledSkillsManual(executor)
  } catch {
    return await getInstalledSkillsManual(executor)
  }
}

/**
 * 手动获取已安装技能（读取目录列表）
 */
async function getInstalledSkillsManual(executor) {
  try {
    const homeDir = await executor.getHomeDir()
    const skillsDir = `${homeDir}/.openclaw/skills`

    const exists = await executor.exists(skillsDir)
    if (!exists) return []

    const result = await executor.exec(`ls -1 "${skillsDir}"`, { timeout: 5000 })
    if (result.exitCode !== 0) return []

    return result.stdout
      .trim()
      .split('\n')
      .filter((name) => name && !name.startsWith('.'))
  } catch {
    return []
  }
}

/**
 * 检查技能更新
 * @param {object} executor - 执行器实例
 * @returns {Promise<Array<{name: string, currentVersion: string, latestVersion: string}>>}
 */
async function checkSkillUpdates(executor) {
  const installed = await getInstalledSkills(executor)
  if (installed.length === 0) return []

  const updates = []
  for (const slug of installed) {
    try {
      const detail = await fetchSkillDetail(slug)
      if (detail && detail.version) {
        updates.push({
          name: slug,
          currentVersion: '已安装',
          latestVersion: detail.version,
          hasUpdate: true,
        })
      }
    } catch {
      // 跳过无法获取详情的技能
    }
  }

  return updates
}

/**
 * 清除缓存
 */
function clearCache() {
  skillListCache = null
  skillListCacheTime = 0
}

module.exports = {
  SkillEvents,
  fetchSkillList,
  fetchSkillDetail,
  searchSkills,
  installSkill,
  uninstallSkill,
  getInstalledSkills,
  checkSkillUpdates,
  clearCache,
}
