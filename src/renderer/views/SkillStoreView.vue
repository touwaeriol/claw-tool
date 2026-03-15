<script setup lang="ts">
  /**
   * 技能商店页面
   * 浏览、搜索、安装/卸载 ClawHub 技能
   * 数据来源：ClawHub 官方 API (clawhub.ai/api/v1)
   */
  import { ref, onMounted, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useSkillStore } from '../stores/skill.js'
  import { getBackend } from '../utils/nw-bridge'

  const skillStore = useSkillStore()
  const { t } = useI18n()

  // markdown-it 渲染器
  const backend = getBackend()
  const MarkdownIt = backend?.MarkdownIt ?? null
  const md = MarkdownIt ? new MarkdownIt({ html: false, linkify: true, breaks: true }) : null

  // 详情抽屉
  const drawerVisible = ref(false)

  // 搜索防抖定时器
  let searchTimer = null

  // 排序选项（computed 以支持 i18n 响应式）
  const sortOptions = [
    { label: t('skillStore.sortRecent'), value: '' },
    { label: t('skillStore.sortDownloads'), value: 'downloads' },
    { label: t('skillStore.sortStars'), value: 'stars' },
    { label: t('skillStore.sortInstalls'), value: 'installs' },
    { label: t('skillStore.sortTrending'), value: 'trending' },
  ]

  onMounted(() => {
    skillStore.loadAll()
  })

  // 搜索关键词变化时触发服务端搜索（防抖 400ms）
  watch(
    () => skillStore.searchKeyword,
    (val) => {
      if (searchTimer) clearTimeout(searchTimer)
      searchTimer = setTimeout(() => {
        skillStore.doSearch(val)
      }, 400)
    },
  )

  /**
   * 渲染 Markdown
   */
  function renderMarkdown(content) {
    if (!md || !content) return ''
    return md.render(content)
  }

  /**
   * 格式化数字（千位缩写）
   */
  function formatNumber(num) {
    if (!num) return '0'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
    return String(num)
  }

  /**
   * 查看技能详情
   */
  async function viewDetail(slug) {
    drawerVisible.value = true
    await skillStore.fetchDetail(slug)
  }

  /**
   * 安装技能
   */
  async function handleInstall(slug) {
    const result = await skillStore.installSkill(slug)
    if (result.success) {
      ElMessage.success(result.message)
    } else {
      ElMessage.error(result.message)
    }
  }

  /**
   * 卸载技能
   */
  async function handleUninstall(slug) {
    try {
      await ElMessageBox.confirm(
        t('skillStore.confirmUninstall', { slug }),
        t('skillStore.confirmUninstallTitle'),
        { type: 'warning' },
      )
    } catch {
      return
    }

    const result = await skillStore.uninstallSkill(slug)
    if (result.success) {
      ElMessage.success(result.message)
    } else {
      ElMessage.error(result.message)
    }
  }

  /**
   * 刷新列表
   */
  function handleRefresh() {
    skillStore.refresh()
  }

  /**
   * 切换排序
   */
  function handleSortChange(sort) {
    skillStore.changeSort(sort)
  }
</script>

<template>
  <div class="skill-store-view">
    <!-- 顶部搜索栏 -->
    <div class="skill-toolbar">
      <el-input
        v-model="skillStore.searchKeyword"
        :placeholder="$t('skillStore.searchPlaceholder')"
        clearable
        class="skill-search"
      >
        <template #prefix>
          <el-icon><ElIconSearch /></el-icon>
        </template>
        <template v-if="skillStore.searching" #suffix>
          <el-icon class="is-loading"><ElIconLoading /></el-icon>
        </template>
      </el-input>

      <el-select
        v-model="skillStore.selectedTag"
        :placeholder="$t('skillStore.allTags')"
        clearable
        class="skill-tag-filter"
      >
        <el-option v-for="tag in skillStore.allTags" :key="tag" :label="tag" :value="tag" />
      </el-select>

      <el-select
        :model-value="skillStore.sortBy"
        :placeholder="$t('skillStore.sort')"
        class="skill-sort"
        @change="handleSortChange"
      >
        <el-option
          v-for="opt in sortOptions"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>

      <el-button :loading="skillStore.loading" @click="handleRefresh">
        <el-icon><ElIconRefresh /></el-icon>
        {{ $t('common.refresh') }}
      </el-button>
    </div>

    <!-- 错误提示 -->
    <el-alert
      v-if="skillStore.errorMessage"
      :title="skillStore.errorMessage"
      type="error"
      closable
      show-icon
      style="margin-bottom: 16px"
      @close="skillStore.errorMessage = ''"
    />

    <!-- 加载状态 -->
    <div v-if="skillStore.loading && skillStore.displaySkills.length === 0" class="skill-loading">
      <el-icon class="is-loading" :size="32">
        <ElIconLoading />
      </el-icon>
      <p>{{ $t('skillStore.loadingSkills') }}</p>
    </div>

    <!-- 空状态 -->
    <el-empty
      v-else-if="!skillStore.loading && skillStore.displaySkills.length === 0"
      :description="$t('skillStore.noMatch')"
    />

    <!-- 技能卡片网格 -->
    <template v-else>
      <div class="skill-grid">
        <el-card
          v-for="skill in skillStore.displaySkills"
          :key="skill.slug || skill.name"
          class="skill-card hover-card"
          shadow="never"
          @click="viewDetail(skill.slug || skill.name)"
        >
          <!-- 技能图标 -->
          <div class="skill-card-icon">
            <el-icon :size="28" color="var(--ct-primary)">
              <ElIconMagicStick />
            </el-icon>
          </div>

          <!-- 技能信息 -->
          <div class="skill-card-body">
            <div class="skill-card-name">
              {{ skill.displayName || skill.name }}
              <el-tag
                v-if="skillStore.isInstalled(skill.slug || skill.name)"
                type="success"
                size="small"
                effect="plain"
              >
                {{ $t('status.installed') }}
              </el-tag>
            </div>

            <div class="skill-card-desc">
              {{ skill.description || $t('skillStore.noDescription') }}
            </div>

            <!-- 统计数据 -->
            <div class="skill-card-stats">
              <span v-if="skill.downloads" class="stat-item" :title="$t('skillStore.download')">
                <el-icon :size="12">
                  <ElIconDownload />
                </el-icon>
                {{ formatNumber(skill.downloads) }}
              </span>
              <span v-if="skill.stars" class="stat-item" :title="$t('skillStore.star')">
                <el-icon :size="12">
                  <ElIconStar />
                </el-icon>
                {{ formatNumber(skill.stars) }}
              </span>
              <span v-if="skill.version" class="stat-item"> v{{ skill.version }} </span>
            </div>

            <!-- 标签 -->
            <div
              v-if="skill.tags && skill.tags.filter((t) => t !== 'latest').length"
              class="skill-card-tags"
            >
              <el-tag
                v-for="tag in skill.tags.filter((t) => t !== 'latest').slice(0, 3)"
                :key="tag"
                size="small"
                effect="plain"
                type="info"
              >
                {{ tag }}
              </el-tag>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="skill-card-actions" @click.stop>
            <el-button
              v-if="!skillStore.isInstalled(skill.slug || skill.name)"
              type="primary"
              size="small"
              :loading="skillStore.isInstalling(skill.slug || skill.name)"
              @click="handleInstall(skill.slug || skill.name)"
            >
              {{
                skillStore.isInstalling(skill.slug || skill.name)
                  ? $t('status.installing')
                  : $t('common.install')
              }}
            </el-button>
            <el-button
              v-else
              type="danger"
              size="small"
              plain
              @click="handleUninstall(skill.slug || skill.name)"
            >
              {{ $t('common.uninstall') }}
            </el-button>
          </div>
        </el-card>
      </div>

      <!-- 加载更多 -->
      <div v-if="skillStore.hasMore" class="skill-load-more">
        <el-button :loading="skillStore.loadingMore" @click="skillStore.loadMore()">
          {{ $t('skillStore.loadMore') }}
        </el-button>
      </div>
    </template>

    <!-- 技能详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="
        skillStore.currentDetail?.displayName ||
        skillStore.currentDetail?.slug ||
        $t('skillStore.skillDetail')
      "
      size="50%"
      direction="rtl"
    >
      <div v-if="skillStore.detailLoading" class="skill-loading">
        <el-icon class="is-loading" :size="24">
          <ElIconLoading />
        </el-icon>
        <p>{{ $t('common.loading') }}</p>
      </div>

      <div v-else-if="skillStore.currentDetail" class="skill-detail">
        <!-- 基本信息 -->
        <div class="detail-header">
          <el-icon :size="36" color="var(--ct-primary)">
            <ElIconMagicStick />
          </el-icon>
          <div class="detail-header-info">
            <h2>{{ skillStore.currentDetail.displayName || skillStore.currentDetail.slug }}</h2>
            <p v-if="skillStore.currentDetail.description">
              {{ skillStore.currentDetail.description }}
            </p>
          </div>
        </div>

        <el-divider />

        <!-- 元信息 -->
        <div class="detail-meta">
          <el-descriptions :column="2" size="small" border>
            <el-descriptions-item :label="$t('skillStore.author')">
              {{
                skillStore.currentDetail.owner?.displayName ||
                skillStore.currentDetail.owner?.handle ||
                '--'
              }}
            </el-descriptions-item>
            <el-descriptions-item :label="$t('skillStore.version')">
              {{ skillStore.currentDetail.version || '--' }}
            </el-descriptions-item>
            <el-descriptions-item
              v-if="skillStore.currentDetail.license"
              :label="$t('skillStore.license')"
            >
              {{ skillStore.currentDetail.license }}
            </el-descriptions-item>
            <el-descriptions-item
              v-if="skillStore.currentDetail.stats"
              :label="$t('skillStore.stats')"
            >
              {{ $t('skillStore.download') }}
              {{ formatNumber(skillStore.currentDetail.stats.downloads) }} /
              {{ $t('skillStore.star') }} {{ formatNumber(skillStore.currentDetail.stats.stars) }} /
              {{ $t('skillStore.sortInstalls') }}
              {{ formatNumber(skillStore.currentDetail.stats.installsCurrent) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 标签 -->
        <div
          v-if="
            skillStore.currentDetail.tags &&
            skillStore.currentDetail.tags.filter((t) => t !== 'latest').length
          "
          class="detail-tags"
        >
          <el-tag
            v-for="tag in skillStore.currentDetail.tags.filter((t) => t !== 'latest')"
            :key="tag"
            size="small"
            effect="plain"
          >
            {{ tag }}
          </el-tag>
        </div>

        <!-- 安装/卸载按钮 -->
        <div class="detail-actions">
          <el-button
            v-if="!skillStore.isInstalled(skillStore.currentDetail.slug)"
            type="primary"
            :loading="skillStore.isInstalling(skillStore.currentDetail.slug)"
            @click="handleInstall(skillStore.currentDetail.slug)"
          >
            <el-icon><ElIconDownload /></el-icon>
            {{ $t('skillStore.installSkill') }}
          </el-button>
          <el-button
            v-else
            type="danger"
            plain
            @click="handleUninstall(skillStore.currentDetail.slug)"
          >
            <el-icon><ElIconDelete /></el-icon>
            {{ $t('skillStore.uninstallSkill') }}
          </el-button>

          <el-link
            :href="`https://clawhub.ai/skills/${skillStore.currentDetail.slug}`"
            target="_blank"
            type="primary"
            style="margin-left: 12px"
          >
            {{ $t('skillStore.viewOnClawHub') }}
          </el-link>
        </div>

        <el-divider />

        <!-- Changelog / README -->
        <div class="detail-readme">
          <h3>{{ $t('skillStore.changelog') }}</h3>
          <div
            v-if="skillStore.currentDetail.changelog"
            class="markdown-body"
            v-html="renderMarkdown(skillStore.currentDetail.changelog)"
          />
          <el-empty v-else :description="$t('skillStore.noChangelog')" :image-size="60" />
        </div>
      </div>

      <el-empty v-else :description="$t('skillStore.cannotLoadDetail')" />
    </el-drawer>
  </div>
</template>

<style scoped>
  .skill-store-view {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* 工具栏 */
  .skill-toolbar {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .skill-search {
    flex: 1;
    max-width: 400px;
  }

  .skill-tag-filter {
    width: 140px;
  }

  .skill-sort {
    width: 130px;
  }

  /* 加载状态 */
  .skill-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 0;
    color: var(--ct-text-secondary);
    gap: 12px;
  }

  /* 卡片网格 */
  .skill-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 16px;
  }

  .skill-card {
    cursor: pointer;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
    background: var(--ct-bg-card);
    border-color: var(--ct-border);
  }

  .skill-card:hover {
    border-color: var(--ct-primary);
  }

  .skill-card :deep(.el-card__body) {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 16px;
  }

  .skill-card-icon {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(64, 158, 255, 0.08);
    border-radius: 8px;
  }

  .skill-card-body {
    flex: 1;
    min-width: 0;
  }

  .skill-card-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--ct-text-primary);
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .skill-card-desc {
    font-size: 12px;
    color: var(--ct-text-secondary);
    line-height: 1.5;
    margin-bottom: 6px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .skill-card-stats {
    display: flex;
    gap: 12px;
    font-size: 11px;
    color: var(--ct-text-placeholder);
    margin-bottom: 6px;
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .skill-card-tags {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .skill-card-actions {
    flex-shrink: 0;
    align-self: center;
  }

  /* 加载更多 */
  .skill-load-more {
    display: flex;
    justify-content: center;
    padding: 16px 0;
  }

  /* 详情抽屉 */
  .skill-detail {
    padding: 0 4px;
  }

  .detail-header {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  .detail-header-info h2 {
    margin: 0 0 4px 0;
    font-size: 20px;
    color: var(--ct-text-primary);
  }

  .detail-header-info p {
    margin: 0;
    color: var(--ct-text-secondary);
    font-size: 13px;
  }

  .detail-meta {
    margin: 12px 0;
  }

  .detail-tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin: 12px 0;
  }

  .detail-actions {
    display: flex;
    align-items: center;
    margin: 16px 0;
  }

  .detail-readme h3 {
    font-size: 15px;
    color: var(--ct-text-primary);
    margin-bottom: 12px;
  }

  /* Markdown 内容样式 */
  .markdown-body {
    font-size: 13px;
    line-height: 1.7;
    color: var(--ct-text-regular);
    word-break: break-word;
  }

  .markdown-body :deep(h1),
  .markdown-body :deep(h2),
  .markdown-body :deep(h3) {
    color: var(--ct-text-primary);
    margin: 16px 0 8px 0;
  }

  .markdown-body :deep(code) {
    background: var(--ct-bg-base);
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 12px;
  }

  .markdown-body :deep(pre) {
    background: var(--ct-bg-base);
    padding: 12px;
    border-radius: var(--ct-radius-sm);
    overflow-x: auto;
  }

  .markdown-body :deep(pre code) {
    padding: 0;
    background: none;
  }

  .markdown-body :deep(a) {
    color: var(--ct-primary);
  }

  .markdown-body :deep(blockquote) {
    border-left: 3px solid var(--ct-border);
    padding-left: 12px;
    color: var(--ct-text-secondary);
    margin: 8px 0;
  }

  @media (max-width: 768px) {
    .skill-grid {
      grid-template-columns: 1fr;
    }
    .skill-toolbar {
      flex-wrap: wrap;
    }
  }
</style>
