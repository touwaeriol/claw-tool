import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useInstanceStore } from './instance.js'
import { getBackend } from '../utils/nw-bridge'

/**
 * 工作区状态管理
 * 管理 Soul、Memory、已安装技能、工作区文件
 */
export const useWorkspaceStore = defineStore('workspace', () => {
  const backend = getBackend()
  const workspaceManager = backend?.workspaceManager ?? null
  const skillManager = backend?.skillManager ?? null
  const instanceStore = useInstanceStore()

  // === Soul ===
  const soulContent = ref('')
  const soulExists = ref(false)
  const soulLoading = ref(false)
  const soulSaving = ref(false)

  // === Memory ===
  const memoryContent = ref('')
  const memoryExists = ref(false)
  const memoryLoading = ref(false)
  const memorySaving = ref(false)
  const memoryLogs = ref([])
  const memoryLogsLoading = ref(false)
  const currentLogName = ref('')
  const currentLogContent = ref('')
  const currentLogLoading = ref(false)
  const memoryStatusOutput = ref('')
  const memoryStatusLoading = ref(false)
  const memoryIndexing = ref(false)

  // === Installed Skills ===
  const installedSkills = ref([])
  const skillsLoading = ref(false)
  const currentSkillSlug = ref('')
  const currentSkillContent = ref('')
  const currentSkillLoading = ref(false)
  const currentSkillSaving = ref(false)

  // === Workspace Files ===
  const workspaceFileContent = ref('')
  const workspaceFileExists = ref(false)
  const workspaceFileLoading = ref(false)
  const workspaceFileSaving = ref(false)
  const currentWorkspaceFile = ref('')

  /**
   * 获取当前执行器
   */
  function getExecutor() {
    return instanceStore.getActiveExecutor()
  }

  // ========== Soul ==========

  async function loadSoul() {
    if (!workspaceManager) return
    const executor = getExecutor()
    if (!executor) return

    soulLoading.value = true
    try {
      const result = await workspaceManager.readWorkspaceFile('SOUL.md', executor)
      soulContent.value = result.content
      soulExists.value = result.exists
    } catch (err) {
      console.error('[工作区] 加载 Soul 失败:', err.message)
    } finally {
      soulLoading.value = false
    }
  }

  async function saveSoul(content) {
    if (!workspaceManager) return { success: false, message: '运行环境不可用' }
    const executor = getExecutor()
    if (!executor) return { success: false, message: '无可用执行器' }

    soulSaving.value = true
    try {
      const result = await workspaceManager.writeWorkspaceFile('SOUL.md', content, executor)
      if (result.success) {
        soulContent.value = content
        soulExists.value = true
      }
      return result
    } finally {
      soulSaving.value = false
    }
  }

  async function createDefaultSoul() {
    if (!workspaceManager) return { success: false, message: '运行环境不可用' }
    const executor = getExecutor()
    if (!executor) return { success: false, message: '无可用执行器' }

    soulSaving.value = true
    try {
      const result = await workspaceManager.createDefaultFile('SOUL.md', executor)
      if (result.success) {
        soulContent.value = result.content
        soulExists.value = true
      }
      return result
    } finally {
      soulSaving.value = false
    }
  }

  // ========== Memory ==========

  async function loadMemory() {
    if (!workspaceManager) return
    const executor = getExecutor()
    if (!executor) return

    memoryLoading.value = true
    try {
      const result = await workspaceManager.readWorkspaceFile('MEMORY.md', executor)
      memoryContent.value = result.content
      memoryExists.value = result.exists
    } catch (err) {
      console.error('[工作区] 加载 Memory 失败:', err.message)
    } finally {
      memoryLoading.value = false
    }
  }

  async function saveMemory(content) {
    if (!workspaceManager) return { success: false, message: '运行环境不可用' }
    const executor = getExecutor()
    if (!executor) return { success: false, message: '无可用执行器' }

    memorySaving.value = true
    try {
      const result = await workspaceManager.writeWorkspaceFile('MEMORY.md', content, executor)
      if (result.success) {
        memoryContent.value = content
        memoryExists.value = true
      }
      return result
    } finally {
      memorySaving.value = false
    }
  }

  async function createDefaultMemory() {
    if (!workspaceManager) return { success: false, message: '运行环境不可用' }
    const executor = getExecutor()
    if (!executor) return { success: false, message: '无可用执行器' }

    memorySaving.value = true
    try {
      const result = await workspaceManager.createDefaultFile('MEMORY.md', executor)
      if (result.success) {
        memoryContent.value = result.content
        memoryExists.value = true
      }
      return result
    } finally {
      memorySaving.value = false
    }
  }

  async function loadMemoryLogs() {
    if (!workspaceManager) return
    const executor = getExecutor()
    if (!executor) return

    memoryLogsLoading.value = true
    try {
      memoryLogs.value = await workspaceManager.listMemoryLogs(executor)
    } catch (err) {
      console.error('[工作区] 加载记忆日志列表失败:', err.message)
    } finally {
      memoryLogsLoading.value = false
    }
  }

  async function loadMemoryLog(filename) {
    if (!workspaceManager) return
    const executor = getExecutor()
    if (!executor) return

    currentLogName.value = filename
    currentLogLoading.value = true
    try {
      const result = await workspaceManager.readMemoryLog(filename, executor)
      currentLogContent.value = result.content
    } catch (err) {
      console.error(`[工作区] 读取记忆日志失败 (${filename}):`, err.message)
      currentLogContent.value = ''
    } finally {
      currentLogLoading.value = false
    }
  }

  async function loadMemoryStatus() {
    if (!workspaceManager) return
    const executor = getExecutor()
    if (!executor) return

    memoryStatusLoading.value = true
    try {
      const result = await workspaceManager.getMemoryStatus(executor)
      memoryStatusOutput.value = result.output
    } catch (err) {
      memoryStatusOutput.value = `查询失败: ${err.message}`
    } finally {
      memoryStatusLoading.value = false
    }
  }

  async function rebuildMemoryIndex() {
    if (!workspaceManager) return { success: false, output: '运行环境不可用' }
    const executor = getExecutor()
    if (!executor) return { success: false, output: '无可用执行器' }

    memoryIndexing.value = true
    try {
      return await workspaceManager.rebuildMemoryIndex(executor)
    } finally {
      memoryIndexing.value = false
    }
  }

  // ========== Installed Skills ==========

  async function loadInstalledSkills() {
    if (!workspaceManager) return
    const executor = getExecutor()
    if (!executor) return

    skillsLoading.value = true
    try {
      installedSkills.value = await workspaceManager.listInstalledSkillsDetailed(executor)
    } catch (err) {
      console.error('[工作区] 加载已安装技能失败:', err.message)
    } finally {
      skillsLoading.value = false
    }
  }

  async function loadSkillFile(slug) {
    if (!workspaceManager) return
    const executor = getExecutor()
    if (!executor) return

    currentSkillSlug.value = slug
    currentSkillLoading.value = true
    try {
      const result = await workspaceManager.readSkillFile(slug, executor)
      currentSkillContent.value = result.content
    } catch (err) {
      currentSkillContent.value = ''
    } finally {
      currentSkillLoading.value = false
    }
  }

  async function saveSkillFile(slug, content) {
    if (!workspaceManager) return { success: false, message: '运行环境不可用' }
    const executor = getExecutor()
    if (!executor) return { success: false, message: '无可用执行器' }

    currentSkillSaving.value = true
    try {
      const result = await workspaceManager.writeSkillFile(slug, content, executor)
      if (result.success) {
        currentSkillContent.value = content
      }
      return result
    } finally {
      currentSkillSaving.value = false
    }
  }

  async function uninstallSkill(slug) {
    if (!skillManager) return { success: false, message: '运行环境不可用' }
    const executor = getExecutor()
    if (!executor) return { success: false, message: '无可用执行器' }

    try {
      const result = await skillManager.uninstallSkill(slug, executor)
      if (result.success) {
        installedSkills.value = installedSkills.value.filter((s) => s.slug !== slug)
        if (currentSkillSlug.value === slug) {
          currentSkillSlug.value = ''
          currentSkillContent.value = ''
        }
      }
      return result
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  // ========== Workspace Files ==========

  async function loadWorkspaceFile(filename) {
    if (!workspaceManager) return
    const executor = getExecutor()
    if (!executor) return

    currentWorkspaceFile.value = filename
    workspaceFileLoading.value = true
    try {
      const result = await workspaceManager.readWorkspaceFile(filename, executor)
      workspaceFileContent.value = result.content
      workspaceFileExists.value = result.exists
    } catch (err) {
      console.error(`[工作区] 加载文件失败 (${filename}):`, err.message)
      workspaceFileContent.value = ''
      workspaceFileExists.value = false
    } finally {
      workspaceFileLoading.value = false
    }
  }

  async function saveWorkspaceFile(filename, content) {
    if (!workspaceManager) return { success: false, message: '运行环境不可用' }
    const executor = getExecutor()
    if (!executor) return { success: false, message: '无可用执行器' }

    workspaceFileSaving.value = true
    try {
      const result = await workspaceManager.writeWorkspaceFile(filename, content, executor)
      if (result.success) {
        workspaceFileContent.value = content
        workspaceFileExists.value = true
      }
      return result
    } finally {
      workspaceFileSaving.value = false
    }
  }

  async function createDefaultWorkspaceFile(filename) {
    if (!workspaceManager) return { success: false, message: '运行环境不可用' }
    const executor = getExecutor()
    if (!executor) return { success: false, message: '无可用执行器' }

    workspaceFileSaving.value = true
    try {
      const result = await workspaceManager.createDefaultFile(filename, executor)
      if (result.success) {
        workspaceFileContent.value = result.content
        workspaceFileExists.value = true
      }
      return result
    } finally {
      workspaceFileSaving.value = false
    }
  }

  return {
    // Soul
    soulContent,
    soulExists,
    soulLoading,
    soulSaving,
    loadSoul,
    saveSoul,
    createDefaultSoul,

    // Memory
    memoryContent,
    memoryExists,
    memoryLoading,
    memorySaving,
    memoryLogs,
    memoryLogsLoading,
    currentLogName,
    currentLogContent,
    currentLogLoading,
    memoryStatusOutput,
    memoryStatusLoading,
    memoryIndexing,
    loadMemory,
    saveMemory,
    createDefaultMemory,
    loadMemoryLogs,
    loadMemoryLog,
    loadMemoryStatus,
    rebuildMemoryIndex,

    // Installed Skills
    installedSkills,
    skillsLoading,
    currentSkillSlug,
    currentSkillContent,
    currentSkillLoading,
    currentSkillSaving,
    loadInstalledSkills,
    loadSkillFile,
    saveSkillFile,
    uninstallSkill,

    // Workspace Files
    workspaceFileContent,
    workspaceFileExists,
    workspaceFileLoading,
    workspaceFileSaving,
    currentWorkspaceFile,
    loadWorkspaceFile,
    saveWorkspaceFile,
    createDefaultWorkspaceFile,
  }
})
