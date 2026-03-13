import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useInstanceStore } from './instance.js'
import { getBackend } from '../utils/nw-bridge'

/**
 * 技能商店状态管理
 * 使用 ClawHub 官方 API (clawhub.ai/api/v1)
 */
export const useSkillStore = defineStore('skill', () => {
  // 获取 Node.js 模块（NW.js 环境）
  const backend = getBackend()
  const skillManager = backend?.skillManager ?? null

  const instanceStore = useInstanceStore()

  // 远程技能列表
  const remoteSkills = ref([])
  // 已安装的技能 slug 列表
  const installedSkills = ref([])
  // 分页游标
  const nextCursor = ref(null)
  // 加载状态
  const loading = ref(false)
  // 加载更多状态
  const loadingMore = ref(false)
  // 安装中的技能
  const installingSkills = ref(new Set())
  // 搜索关键词
  const searchKeyword = ref('')
  // 搜索结果（服务端搜索）
  const searchResults = ref(null)
  // 搜索中
  const searching = ref(false)
  // 排序方式
  const sortBy = ref('')
  // 分类筛选
  const selectedTag = ref('')
  // 当前查看的技能详情
  const currentDetail = ref(null)
  // 详情加载中
  const detailLoading = ref(false)
  // 错误信息
  const errorMessage = ref('')

  // 所有标签列表（从已加载的技能中提取）
  const allTags = computed(() => {
    const tagSet = new Set()
    for (const skill of remoteSkills.value) {
      if (skill.tags) {
        for (const tag of skill.tags) {
          if (tag && tag !== 'latest') tagSet.add(tag)
        }
      }
    }
    return Array.from(tagSet).sort()
  })

  // 当前展示的技能列表（搜索结果或列表，经过标签过滤）
  const displaySkills = computed(() => {
    // 如果有搜索关键词且有搜索结果，展示搜索结果
    if (searchKeyword.value && searchResults.value !== null) {
      let list = searchResults.value
      if (selectedTag.value) {
        list = list.filter((s) => s.tags && s.tags.includes(selectedTag.value))
      }
      return list
    }

    // 否则展示列表，按标签过滤
    let list = remoteSkills.value
    if (selectedTag.value) {
      list = list.filter((s) => s.tags && s.tags.includes(selectedTag.value))
    }
    return list
  })

  // 是否可以加载更多
  const hasMore = computed(() => {
    return !searchKeyword.value && nextCursor.value !== null
  })

  /**
   * 获取当前执行器
   */
  function getExecutor() {
    return instanceStore.getActiveExecutor()
  }

  /**
   * 加载远程技能列表（首页）
   */
  async function loadRemoteSkills() {
    if (!skillManager) return
    loading.value = true
    errorMessage.value = ''
    try {
      const result = await skillManager.fetchSkillList({
        sort: sortBy.value || undefined,
      })
      remoteSkills.value = result.items || []
      nextCursor.value = result.nextCursor
    } catch (err) {
      errorMessage.value = `加载技能列表失败: ${err.message}`
      console.error('[技能商店]', errorMessage.value)
    } finally {
      loading.value = false
    }
  }

  /**
   * 加载更多技能（分页）
   */
  async function loadMore() {
    if (!skillManager || !nextCursor.value || loadingMore.value) return
    loadingMore.value = true
    try {
      const result = await skillManager.fetchSkillList({
        cursor: nextCursor.value,
        sort: sortBy.value || undefined,
      })
      remoteSkills.value = [...remoteSkills.value, ...(result.items || [])]
      nextCursor.value = result.nextCursor
    } catch (err) {
      console.error('[技能商店] 加载更多失败:', err.message)
    } finally {
      loadingMore.value = false
    }
  }

  /**
   * 服务端搜索技能
   */
  async function doSearch(query) {
    if (!skillManager) return
    if (!query || !query.trim()) {
      searchResults.value = null
      return
    }
    searching.value = true
    try {
      searchResults.value = await skillManager.searchSkills(query.trim())
    } catch (err) {
      console.error('[技能商店] 搜索失败:', err.message)
      searchResults.value = []
    } finally {
      searching.value = false
    }
  }

  /**
   * 加载已安装技能
   */
  async function loadInstalledSkills() {
    if (!skillManager) return
    const executor = getExecutor()
    if (!executor) return
    try {
      installedSkills.value = await skillManager.getInstalledSkills(executor)
    } catch (err) {
      console.error('[技能商店] 加载已安装技能失败:', err.message)
    }
  }

  /**
   * 加载全部数据
   */
  async function loadAll() {
    await Promise.all([loadRemoteSkills(), loadInstalledSkills()])
  }

  /**
   * 判断技能是否已安装
   */
  function isInstalled(slug) {
    return installedSkills.value.includes(slug)
  }

  /**
   * 判断技能是否正在安装
   */
  function isInstalling(slug) {
    return installingSkills.value.has(slug)
  }

  /**
   * 安装技能
   */
  async function installSkill(slug) {
    if (!skillManager) return { success: false, message: '运行环境不可用' }
    const executor = getExecutor()
    if (!executor) return { success: false, message: '无可用执行器' }

    installingSkills.value.add(slug)
    try {
      const result = await skillManager.installSkill(slug, executor)
      if (result.success) {
        await loadInstalledSkills()
      }
      return result
    } finally {
      installingSkills.value.delete(slug)
    }
  }

  /**
   * 卸载技能
   */
  async function uninstallSkill(slug) {
    if (!skillManager) return { success: false, message: '运行环境不可用' }
    const executor = getExecutor()
    if (!executor) return { success: false, message: '无可用执行器' }

    try {
      const result = await skillManager.uninstallSkill(slug, executor)
      if (result.success) {
        await loadInstalledSkills()
      }
      return result
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  /**
   * 获取技能详情
   */
  async function fetchDetail(slug) {
    if (!skillManager) return
    detailLoading.value = true
    try {
      currentDetail.value = await skillManager.fetchSkillDetail(slug)
    } catch (err) {
      console.error('[技能商店] 获取详情失败:', err.message)
      currentDetail.value = null
    } finally {
      detailLoading.value = false
    }
  }

  /**
   * 切换排序方式并重新加载
   */
  async function changeSort(sort) {
    sortBy.value = sort
    await loadRemoteSkills()
  }

  /**
   * 刷新（清除缓存后重新加载）
   */
  async function refresh() {
    if (skillManager) {
      skillManager.clearCache()
    }
    searchResults.value = null
    searchKeyword.value = ''
    await loadAll()
  }

  return {
    remoteSkills,
    installedSkills,
    nextCursor,
    loading,
    loadingMore,
    installingSkills,
    searchKeyword,
    searchResults,
    searching,
    sortBy,
    selectedTag,
    currentDetail,
    detailLoading,
    errorMessage,
    allTags,
    displaySkills,
    hasMore,
    loadRemoteSkills,
    loadMore,
    doSearch,
    loadInstalledSkills,
    loadAll,
    isInstalled,
    isInstalling,
    installSkill,
    uninstallSkill,
    fetchDetail,
    changeSort,
    refresh,
  }
})
