<script setup>
  /**
   * 工作区管理页面
   * 4 个 Tab：灵魂 | 记忆 | 已安装技能 | 工作区文件
   */
  import { ref, onMounted, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useWorkspaceStore } from '../stores/workspace.js'
  import MarkdownEditor from '../components/workspace/MarkdownEditor.vue'

  const { t } = useI18n()
  const store = useWorkspaceStore()
  const activeTab = ref('soul')

  // 工作区文件列表
  const workspaceFiles = [
    { name: 'AGENTS.md', label: 'AGENTS.md' },
    { name: 'USER.md', label: 'USER.md' },
    { name: 'IDENTITY.md', label: 'IDENTITY.md' },
  ]
  const selectedWorkspaceFile = ref('AGENTS.md')

  // Soul Tab 编辑内容
  const soulEditContent = ref('')
  // Memory Tab 编辑内容
  const memoryEditContent = ref('')
  // 工作区文件编辑内容
  const wsFileEditContent = ref('')
  // 技能编辑内容
  const skillEditContent = ref('')

  // ========== 生命周期 ==========

  onMounted(() => {
    loadTabData('soul')
  })

  watch(activeTab, (tab) => {
    loadTabData(tab)
  })

  function loadTabData(tab) {
    if (tab === 'soul') {
      store.loadSoul().then(() => {
        soulEditContent.value = store.soulContent
      })
    } else if (tab === 'memory') {
      store.loadMemory().then(() => {
        memoryEditContent.value = store.memoryContent
      })
      store.loadMemoryLogs()
    } else if (tab === 'skills') {
      store.loadInstalledSkills()
    } else if (tab === 'files') {
      loadWorkspaceFileContent(selectedWorkspaceFile.value)
    }
  }

  // ========== Soul 操作 ==========

  async function saveSoul() {
    const result = await store.saveSoul(soulEditContent.value)
    if (result.success) {
      ElMessage.success(t('workspace.fileSaved'))
    } else {
      ElMessage.error(result.message)
    }
  }

  async function createSoul() {
    const result = await store.createDefaultSoul()
    if (result.success) {
      soulEditContent.value = result.content
      ElMessage.success(t('workspace.fileCreated'))
    } else {
      ElMessage.error(result.message)
    }
  }

  // ========== Memory 操作 ==========

  async function saveMemory() {
    const result = await store.saveMemory(memoryEditContent.value)
    if (result.success) {
      ElMessage.success(t('workspace.fileSaved'))
    } else {
      ElMessage.error(result.message)
    }
  }

  async function createMemory() {
    const result = await store.createDefaultMemory()
    if (result.success) {
      memoryEditContent.value = result.content
      ElMessage.success(t('workspace.fileCreated'))
    } else {
      ElMessage.error(result.message)
    }
  }

  function viewMemoryLog(filename) {
    store.loadMemoryLog(filename)
  }

  async function refreshMemoryStatus() {
    await store.loadMemoryStatus()
  }

  async function doRebuildIndex() {
    const result = await store.rebuildMemoryIndex()
    if (result.success) {
      ElMessage.success(t('workspace.indexRebuilt'))
    } else {
      ElMessage.warning(result.output)
    }
  }

  // ========== Skills 操作 ==========

  function viewSkill(slug) {
    store.loadSkillFile(slug)
    skillEditContent.value = ''
    // 等加载完成后同步
    const unwatch = watch(
      () => store.currentSkillContent,
      (val) => {
        skillEditContent.value = val
        unwatch()
      },
    )
  }

  async function saveSkill() {
    const result = await store.saveSkillFile(store.currentSkillSlug, skillEditContent.value)
    if (result.success) {
      ElMessage.success(t('workspace.fileSaved'))
    } else {
      ElMessage.error(result.message)
    }
  }

  async function confirmUninstallSkill(slug) {
    try {
      await ElMessageBox.confirm(
        t('workspace.confirmUninstall', { slug }),
        t('workspace.confirmUninstallTitle'),
        { type: 'warning' },
      )
      const result = await store.uninstallSkill(slug)
      if (result.success) {
        ElMessage.success(t('workspace.skillUninstalled'))
      } else {
        ElMessage.error(result.message)
      }
    } catch {
      // 取消
    }
  }

  // ========== Workspace Files 操作 ==========

  function loadWorkspaceFileContent(filename) {
    selectedWorkspaceFile.value = filename
    store.loadWorkspaceFile(filename).then(() => {
      wsFileEditContent.value = store.workspaceFileContent
    })
  }

  watch(selectedWorkspaceFile, (filename) => {
    loadWorkspaceFileContent(filename)
  })

  async function saveWorkspaceFile() {
    const result = await store.saveWorkspaceFile(
      selectedWorkspaceFile.value,
      wsFileEditContent.value,
    )
    if (result.success) {
      ElMessage.success(t('workspace.fileSaved'))
    } else {
      ElMessage.error(result.message)
    }
  }

  async function createWorkspaceFile() {
    const result = await store.createDefaultWorkspaceFile(selectedWorkspaceFile.value)
    if (result.success) {
      wsFileEditContent.value = result.content
      ElMessage.success(t('workspace.fileCreated'))
    } else {
      ElMessage.error(result.message)
    }
  }
</script>

<template>
  <div class="workspace-view">
    <el-tabs v-model="activeTab" class="workspace-tabs">
      <!-- ==================== Soul Tab ==================== -->
      <el-tab-pane :label="t('workspace.soul')" name="soul">
        <div class="tab-content">
          <div v-if="store.soulLoading" v-loading="true" class="loading-box" />
          <template v-else>
            <!-- 文件不存在 -->
            <div v-if="!store.soulExists" class="empty-state">
              <el-empty :description="t('workspace.fileNotExists', { name: 'SOUL.md' })">
                <el-button type="primary" :loading="store.soulSaving" @click="createSoul">
                  {{ t('workspace.createDefault') }}
                </el-button>
              </el-empty>
            </div>
            <!-- 编辑器 -->
            <MarkdownEditor
              v-else
              v-model:content="soulEditContent"
              :title="'SOUL.md'"
              :saving="store.soulSaving"
              @save="saveSoul"
            />
          </template>
        </div>
      </el-tab-pane>

      <!-- ==================== Memory Tab ==================== -->
      <el-tab-pane :label="t('workspace.memory')" name="memory">
        <div class="tab-content memory-tab">
          <!-- MEMORY.md 编辑器 -->
          <div class="memory-editor-section">
            <h4 class="section-title">MEMORY.md</h4>
            <div v-if="store.memoryLoading" v-loading="true" class="loading-box" />
            <template v-else>
              <div v-if="!store.memoryExists" class="empty-state-inline">
                <span>{{ t('workspace.fileNotExists', { name: 'MEMORY.md' }) }}</span>
                <el-button
                  size="small"
                  type="primary"
                  :loading="store.memorySaving"
                  @click="createMemory"
                >
                  {{ t('workspace.createDefault') }}
                </el-button>
              </div>
              <MarkdownEditor
                v-else
                v-model:content="memoryEditContent"
                :saving="store.memorySaving"
                @save="saveMemory"
              />
            </template>
          </div>

          <!-- 记忆日志 + 状态 -->
          <div class="memory-sidebar">
            <!-- 记忆状态 -->
            <div class="memory-status-section">
              <h4 class="section-title">
                {{ t('workspace.memoryStatus') }}
                <el-button
                  size="small"
                  :loading="store.memoryStatusLoading"
                  @click="refreshMemoryStatus"
                >
                  {{ t('common.refresh') }}
                </el-button>
                <el-button
                  size="small"
                  type="warning"
                  :loading="store.memoryIndexing"
                  @click="doRebuildIndex"
                >
                  {{ t('workspace.rebuildIndex') }}
                </el-button>
              </h4>
              <pre v-if="store.memoryStatusOutput" class="status-output">{{
                store.memoryStatusOutput
              }}</pre>
            </div>

            <!-- 记忆日志列表 -->
            <div class="memory-logs-section">
              <h4 class="section-title">
                {{ t('workspace.memoryLogs') }}
                <el-button
                  size="small"
                  :loading="store.memoryLogsLoading"
                  @click="store.loadMemoryLogs()"
                >
                  <el-icon><ElIconRefresh /></el-icon>
                </el-button>
              </h4>
              <div v-if="store.memoryLogs.length === 0" class="no-data">
                {{ t('common.noData') }}
              </div>
              <div v-else class="log-list">
                <div
                  v-for="log in store.memoryLogs"
                  :key="log"
                  class="log-item"
                  :class="{ active: store.currentLogName === log }"
                  @click="viewMemoryLog(log)"
                >
                  <el-icon><ElIconDocument /></el-icon>
                  <span>{{ log }}</span>
                </div>
              </div>

              <!-- 日志内容预览 -->
              <div v-if="store.currentLogName" class="log-preview">
                <h4 class="section-title">
                  {{ store.currentLogName }}
                </h4>
                <div v-if="store.currentLogLoading" v-loading="true" class="loading-box small" />
                <MarkdownEditor
                  v-else
                  :content="store.currentLogContent"
                  :title="store.currentLogName"
                  :readonly="true"
                  :show-save="false"
                />
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- ==================== Installed Skills Tab ==================== -->
      <el-tab-pane :label="t('workspace.installedSkills')" name="skills">
        <div class="tab-content skills-tab">
          <!-- 技能列表 -->
          <div class="skills-list-section">
            <div class="section-header">
              <h4 class="section-title">
                {{ t('workspace.installedSkills') }}
              </h4>
              <el-button
                size="small"
                :loading="store.skillsLoading"
                @click="store.loadInstalledSkills()"
              >
                <el-icon><ElIconRefresh /></el-icon>
              </el-button>
            </div>

            <div v-if="store.skillsLoading" v-loading="true" class="loading-box" />
            <div v-else-if="store.installedSkills.length === 0" class="no-data">
              {{ t('common.noData') }}
            </div>
            <div v-else class="skill-cards">
              <div
                v-for="skill in store.installedSkills"
                :key="skill.slug"
                class="skill-card"
                :class="{ active: store.currentSkillSlug === skill.slug }"
                @click="viewSkill(skill.slug)"
              >
                <div class="skill-card-header">
                  <span class="skill-name">{{ skill.name || skill.slug }}</span>
                  <el-button
                    size="small"
                    type="danger"
                    text
                    @click.stop="confirmUninstallSkill(skill.slug)"
                  >
                    <el-icon><ElIconDelete /></el-icon>
                  </el-button>
                </div>
                <div v-if="skill.description" class="skill-desc">
                  {{ skill.description }}
                </div>
                <div class="skill-slug">
                  {{ skill.slug }}
                </div>
              </div>
            </div>
          </div>

          <!-- 技能 SKILL.md 编辑器 -->
          <div v-if="store.currentSkillSlug" class="skill-editor-section">
            <div v-if="store.currentSkillLoading" v-loading="true" class="loading-box" />
            <MarkdownEditor
              v-else
              v-model:content="skillEditContent"
              :title="`${store.currentSkillSlug}/SKILL.md`"
              :saving="store.currentSkillSaving"
              @save="saveSkill"
            />
          </div>
        </div>
      </el-tab-pane>

      <!-- ==================== Workspace Files Tab ==================== -->
      <el-tab-pane :label="t('workspace.workspaceFiles')" name="files">
        <div class="tab-content files-tab">
          <!-- 文件选择 -->
          <div class="files-selector">
            <el-radio-group v-model="selectedWorkspaceFile" size="small">
              <el-radio-button v-for="file in workspaceFiles" :key="file.name" :value="file.name">
                {{ file.label }}
              </el-radio-button>
            </el-radio-group>
          </div>

          <!-- 文件编辑器 -->
          <div class="files-editor">
            <div v-if="store.workspaceFileLoading" v-loading="true" class="loading-box" />
            <template v-else>
              <div v-if="!store.workspaceFileExists" class="empty-state">
                <el-empty
                  :description="t('workspace.fileNotExists', { name: selectedWorkspaceFile })"
                >
                  <el-button
                    type="primary"
                    :loading="store.workspaceFileSaving"
                    @click="createWorkspaceFile"
                  >
                    {{ t('workspace.createDefault') }}
                  </el-button>
                </el-empty>
              </div>
              <MarkdownEditor
                v-else
                v-model:content="wsFileEditContent"
                :title="selectedWorkspaceFile"
                :saving="store.workspaceFileSaving"
                @save="saveWorkspaceFile"
              />
            </template>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
  .workspace-view {
    padding: 16px;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .workspace-tabs {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .workspace-tabs :deep(.el-tabs__content) {
    flex: 1;
    overflow: hidden;
  }

  .workspace-tabs :deep(.el-tab-pane) {
    height: 100%;
    overflow: hidden;
  }

  .tab-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .loading-box {
    height: 200px;
  }

  .loading-box.small {
    height: 120px;
  }

  /* Empty state */
  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
  }

  .empty-state-inline {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: var(--el-fill-color-light);
    border-radius: 4px;
    color: var(--el-text-color-secondary);
  }

  /* Section titles */
  .section-title {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 8px 0;
    color: var(--el-text-color-primary);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .section-header .section-title {
    margin-bottom: 0;
  }

  .no-data {
    color: var(--el-text-color-secondary);
    text-align: center;
    padding: 20px;
    font-size: 13px;
  }

  /* ===== Memory Tab ===== */
  .memory-tab {
    flex-direction: row;
    gap: 16px;
  }

  .memory-editor-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }

  .memory-editor-section .section-title {
    flex-shrink: 0;
  }

  .memory-sidebar {
    width: 300px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
  }

  .memory-status-section {
    flex-shrink: 0;
  }

  .status-output {
    font-size: 12px;
    font-family: 'SFMono-Regular', Consolas, monospace;
    background: var(--el-fill-color);
    padding: 8px;
    border-radius: 4px;
    margin: 0;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 150px;
    overflow-y: auto;
    color: var(--el-text-color-regular);
  }

  .memory-logs-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .log-list {
    overflow-y: auto;
    max-height: 200px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 4px;
  }

  .log-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    cursor: pointer;
    font-size: 13px;
    color: var(--el-text-color-regular);
    transition: background 0.15s;
  }

  .log-item:hover {
    background: var(--el-fill-color-light);
  }

  .log-item.active {
    background: rgba(64, 158, 255, 0.1);
    color: var(--el-color-primary);
  }

  .log-preview {
    margin-top: 8px;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 150px;
    overflow: hidden;
  }

  /* ===== Skills Tab ===== */
  .skills-tab {
    flex-direction: row;
    gap: 16px;
  }

  .skills-list-section {
    width: 280px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .skill-cards {
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .skill-card {
    padding: 10px 12px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .skill-card:hover {
    border-color: var(--el-color-primary-light-5);
    background: var(--el-fill-color-light);
  }

  .skill-card.active {
    border-color: var(--el-color-primary);
    background: rgba(64, 158, 255, 0.06);
  }

  .skill-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .skill-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .skill-desc {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-top: 4px;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .skill-slug {
    font-size: 11px;
    color: var(--el-text-color-placeholder);
    margin-top: 4px;
  }

  .skill-editor-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }

  /* ===== Files Tab ===== */
  .files-tab {
    flex-direction: column;
    gap: 12px;
  }

  .files-selector {
    flex-shrink: 0;
  }

  .files-editor {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }
</style>
