/**
 * 工作区文件管理器
 * 管理 OpenClaw 工作区文件：SOUL.md, MEMORY.md, memory/, skills/, AGENTS.md, USER.md, IDENTITY.md
 * 通过 executor 抽象层支持本地和远程实例
 */

const path = require('path')

// 工作区相对路径
const WORKSPACE_DIR = '.openclaw/workspace'
const SKILLS_DIR = '.openclaw/skills'

// 工作区文件定义
const WORKSPACE_FILES = {
  'SOUL.md': { label: 'Soul', description: '灵魂定义文件' },
  'AGENTS.md': { label: 'Agents', description: 'Agent 配置文件' },
  'USER.md': { label: 'User', description: '用户信息文件' },
  'IDENTITY.md': { label: 'Identity', description: '身份信息文件' },
}

// SOUL.md 默认模板
const DEFAULT_SOUL = `# Soul

You are a helpful AI assistant powered by OpenClaw.

## Personality
- Friendly and professional
- Clear and concise in communication
- Proactive in offering help

## Guidelines
- Always be truthful and transparent
- Respect user privacy
- Ask for clarification when needed
`

// MEMORY.md 默认模板
const DEFAULT_MEMORY = `# Memory

This file stores persistent memory for your AI assistant.
Add important context, preferences, and information below.

## User Preferences

## Important Context

## Notes
`

/**
 * 获取工作区目录路径
 * @param {object} executor - 执行器实例
 * @returns {Promise<string>}
 */
async function getWorkspacePath(executor) {
  const homeDir = await executor.getHomeDir()
  return `${homeDir}/${WORKSPACE_DIR}`
}

/**
 * 获取技能目录路径
 * @param {object} executor - 执行器实例
 * @returns {Promise<string>}
 */
async function getSkillsPath(executor) {
  const homeDir = await executor.getHomeDir()
  return `${homeDir}/${SKILLS_DIR}`
}

/**
 * 读取工作区文件
 * @param {string} filename - 文件名（如 SOUL.md）
 * @param {object} executor - 执行器实例
 * @returns {Promise<{exists: boolean, content: string}>}
 */
async function readWorkspaceFile(filename, executor) {
  try {
    const wsPath = await getWorkspacePath(executor)
    const filePath = `${wsPath}/${filename}`
    const fileExists = await executor.exists(filePath)
    if (!fileExists) {
      return { exists: false, content: '' }
    }
    const content = await executor.readFile(filePath)
    return { exists: true, content }
  } catch (err) {
    console.error(`[工作区管理器] 读取文件失败 (${filename}):`, err.message)
    return { exists: false, content: '' }
  }
}

/**
 * 写入工作区文件
 * @param {string} filename - 文件名
 * @param {string} content - 文件内容
 * @param {object} executor - 执行器实例
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function writeWorkspaceFile(filename, content, executor) {
  try {
    const wsPath = await getWorkspacePath(executor)
    const filePath = `${wsPath}/${filename}`
    await executor.writeFile(filePath, content)
    return { success: true, message: `${filename} 已保存` }
  } catch (err) {
    console.error(`[工作区管理器] 写入文件失败 (${filename}):`, err.message)
    return { success: false, message: `保存失败: ${err.message}` }
  }
}

/**
 * 创建默认工作区文件
 * @param {string} filename - 文件名
 * @param {object} executor - 执行器实例
 * @returns {Promise<{success: boolean, content: string, message: string}>}
 */
async function createDefaultFile(filename, executor) {
  let defaultContent = ''
  if (filename === 'SOUL.md') {
    defaultContent = DEFAULT_SOUL
  } else if (filename === 'MEMORY.md') {
    defaultContent = DEFAULT_MEMORY
  } else {
    defaultContent = `# ${filename.replace('.md', '')}\n\n`
  }

  const result = await writeWorkspaceFile(filename, defaultContent, executor)
  if (result.success) {
    return { success: true, content: defaultContent, message: `${filename} 已创建` }
  }
  return { success: false, content: '', message: result.message }
}

/**
 * 列出记忆日志文件
 * @param {object} executor - 执行器实例
 * @returns {Promise<string[]>} 日期文件名列表（如 ['2024-01-15.md', '2024-01-14.md']）
 */
async function listMemoryLogs(executor) {
  try {
    const wsPath = await getWorkspacePath(executor)
    const memoryDir = `${wsPath}/memory`

    const dirExists = await executor.exists(memoryDir)
    if (!dirExists) return []

    const result = await executor.exec(`ls -1 "${memoryDir}"`, { timeout: 5000 })
    if (result.exitCode !== 0) return []

    return result.stdout
      .trim()
      .split('\n')
      .filter((name) => name && name.endsWith('.md'))
      .sort()
      .reverse() // 最新的在前
  } catch (err) {
    console.error('[工作区管理器] 列出记忆日志失败:', err.message)
    return []
  }
}

/**
 * 读取记忆日志文件
 * @param {string} filename - 日志文件名（如 2024-01-15.md）
 * @param {object} executor - 执行器实例
 * @returns {Promise<{exists: boolean, content: string}>}
 */
async function readMemoryLog(filename, executor) {
  try {
    const wsPath = await getWorkspacePath(executor)
    const filePath = `${wsPath}/memory/${filename}`
    const fileExists = await executor.exists(filePath)
    if (!fileExists) {
      return { exists: false, content: '' }
    }
    const content = await executor.readFile(filePath)
    return { exists: true, content }
  } catch (err) {
    console.error(`[工作区管理器] 读取记忆日志失败 (${filename}):`, err.message)
    return { exists: false, content: '' }
  }
}

/**
 * 获取记忆状态
 * @param {object} executor - 执行器实例
 * @returns {Promise<{success: boolean, output: string}>}
 */
async function getMemoryStatus(executor) {
  try {
    const result = await executor.exec('openclaw memory status', { timeout: 15000 })
    return {
      success: result.exitCode === 0,
      output: result.stdout || result.stderr || '无输出',
    }
  } catch (err) {
    return { success: false, output: `执行失败: ${err.message}` }
  }
}

/**
 * 重建记忆索引
 * @param {object} executor - 执行器实例
 * @returns {Promise<{success: boolean, output: string}>}
 */
async function rebuildMemoryIndex(executor) {
  try {
    const result = await executor.exec('openclaw memory index', { timeout: 60000 })
    return {
      success: result.exitCode === 0,
      output: result.stdout || result.stderr || '无输出',
    }
  } catch (err) {
    return { success: false, output: `执行失败: ${err.message}` }
  }
}

/**
 * 列出已安装的技能及其详情
 * @param {object} executor - 执行器实例
 * @returns {Promise<Array<{slug: string, name: string, description: string, content: string}>>}
 */
async function listInstalledSkillsDetailed(executor) {
  try {
    const skillsDir = await getSkillsPath(executor)

    const dirExists = await executor.exists(skillsDir)
    if (!dirExists) return []

    const result = await executor.exec(`ls -1 "${skillsDir}"`, { timeout: 5000 })
    if (result.exitCode !== 0) return []

    const slugs = result.stdout
      .trim()
      .split('\n')
      .filter((name) => name && !name.startsWith('.'))

    const skills = []
    for (const slug of slugs) {
      const skillMdPath = `${skillsDir}/${slug}/SKILL.md`
      let content = ''
      let name = slug
      let description = ''

      try {
        const exists = await executor.exists(skillMdPath)
        if (exists) {
          content = await executor.readFile(skillMdPath)
          const parsed = parseFrontmatter(content)
          name = parsed.name || slug
          description = parsed.description || ''
        }
      } catch {
        // 读取失败时使用默认值
      }

      skills.push({ slug, name, description, content })
    }

    return skills
  } catch (err) {
    console.error('[工作区管理器] 列出已安装技能失败:', err.message)
    return []
  }
}

/**
 * 读取已安装技能的 SKILL.md
 * @param {string} slug - 技能 slug
 * @param {object} executor - 执行器实例
 * @returns {Promise<{exists: boolean, content: string}>}
 */
async function readSkillFile(slug, executor) {
  try {
    const skillsDir = await getSkillsPath(executor)
    const filePath = `${skillsDir}/${slug}/SKILL.md`
    const fileExists = await executor.exists(filePath)
    if (!fileExists) {
      return { exists: false, content: '' }
    }
    const content = await executor.readFile(filePath)
    return { exists: true, content }
  } catch (err) {
    console.error(`[工作区管理器] 读取技能文件失败 (${slug}):`, err.message)
    return { exists: false, content: '' }
  }
}

/**
 * 写入已安装技能的 SKILL.md
 * @param {string} slug - 技能 slug
 * @param {string} content - 文件内容
 * @param {object} executor - 执行器实例
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function writeSkillFile(slug, content, executor) {
  try {
    const skillsDir = await getSkillsPath(executor)
    const filePath = `${skillsDir}/${slug}/SKILL.md`
    await executor.writeFile(filePath, content)
    return { success: true, message: `${slug}/SKILL.md 已保存` }
  } catch (err) {
    return { success: false, message: `保存失败: ${err.message}` }
  }
}

/**
 * 解析 SKILL.md frontmatter
 * @param {string} content - 文件内容
 * @returns {{name: string, description: string}}
 */
function parseFrontmatter(content) {
  const result = { name: '', description: '' }
  if (!content) return result

  const match = content.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!match) return result

  const frontmatter = match[1]
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m)
  if (nameMatch) {
    result.name = nameMatch[1].trim().replace(/^["']|["']$/g, '')
  }

  const descMatch = frontmatter.match(/^description:\s*(.+)$/m)
  if (descMatch) {
    result.description = descMatch[1].trim().replace(/^["']|["']$/g, '')
  }

  return result
}

module.exports = {
  WORKSPACE_FILES,
  getWorkspacePath,
  getSkillsPath,
  readWorkspaceFile,
  writeWorkspaceFile,
  createDefaultFile,
  listMemoryLogs,
  readMemoryLog,
  getMemoryStatus,
  rebuildMemoryIndex,
  listInstalledSkillsDetailed,
  readSkillFile,
  writeSkillFile,
  parseFrontmatter,
}
