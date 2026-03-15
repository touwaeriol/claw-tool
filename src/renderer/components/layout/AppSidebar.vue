<script setup lang="ts">
  /**
   * 侧边导航栏组件
   * 包含应用 logo、导航菜单和折叠控制
   */
  import { ref, computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useI18n } from 'vue-i18n'

  const route = useRoute()
  const router = useRouter()
  const { t } = useI18n()

  /* 折叠状态 */
  const isCollapsed = ref(false)

  /* 导航菜单项（label 为 i18n key） */
  const menuItems = [
    { path: '/', icon: 'Monitor', label: 'menu.dashboard' },
    { path: '/providers', icon: 'Connection', label: 'menu.providers' },
    { path: '/channels', icon: 'ChatDotRound', label: 'menu.channels' },
    { path: '/instances', icon: 'OfficeBuilding', label: 'menu.instances' },
    { path: '/service', icon: 'Setting', label: 'menu.service' },
    { path: '/test', icon: 'ChatLineSquare', label: 'menu.test' },
    { path: '/settings', icon: 'Tools', label: 'menu.settings' },
  ]

  const activeMenu = computed(() => route.path)

  function toggleCollapse() {
    isCollapsed.value = !isCollapsed.value
  }

  function navigateTo(path: string) {
    router.push(path)
  }
</script>

<template>
  <aside class="app-sidebar" :class="{ 'is-collapsed': isCollapsed }">
    <!-- Logo 区域 -->
    <div class="sidebar-logo" @click="navigateTo('/')">
      <div class="logo-icon">
        <el-icon :size="28"><ElIconMonitor /></el-icon>
      </div>
      <transition name="fade">
        <span v-if="!isCollapsed" class="logo-text">Claw Tool</span>
      </transition>
    </div>

    <!-- 导航菜单 -->
    <el-menu
      :default-active="activeMenu"
      :collapse="isCollapsed"
      :collapse-transition="true"
      class="sidebar-menu"
      background-color="transparent"
      text-color="var(--ct-text-secondary)"
      active-text-color="var(--ct-primary)"
      @select="navigateTo"
    >
      <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
        <el-icon><component :is="'ElIcon' + item.icon" /></el-icon>
        <template #title>{{ $t(item.label) }}</template>
      </el-menu-item>
    </el-menu>

    <!-- 折叠按钮 -->
    <div class="sidebar-collapse-btn" @click="toggleCollapse">
      <el-icon :size="16">
        <ElIconDArrowLeft v-if="!isCollapsed" />
        <ElIconDArrowRight v-else />
      </el-icon>
    </div>
  </aside>
</template>

<style scoped>
  .app-sidebar {
    width: var(--ct-sidebar-width);
    height: 100%;
    background: var(--ct-sidebar-bg);
    border-right: 1px solid var(--ct-border);
    display: flex;
    flex-direction: column;
    transition: width var(--ct-transition);
    user-select: none;
    overflow: hidden;
  }

  .app-sidebar.is-collapsed {
    width: var(--ct-sidebar-collapsed-width);
  }

  /* Logo */
  .sidebar-logo {
    height: var(--ct-header-height);
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 10px;
    cursor: pointer;
    border-bottom: 1px solid var(--ct-border);
    flex-shrink: 0;
  }

  .logo-icon {
    color: var(--ct-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .logo-text {
    font-size: 18px;
    font-weight: 700;
    color: var(--ct-text-primary);
    white-space: nowrap;
    letter-spacing: 0.5px;
  }

  /* 菜单 */
  .sidebar-menu {
    flex: 1;
    border-right: none !important;
    padding-top: 8px;
    overflow-y: auto;
  }

  .sidebar-menu :deep(.el-menu-item) {
    height: 44px;
    line-height: 44px;
    margin: 2px 8px;
    border-radius: var(--ct-radius-sm);
  }

  .sidebar-menu :deep(.el-menu-item:hover) {
    background: var(--ct-bg-elevated) !important;
  }

  .sidebar-menu :deep(.el-menu-item.is-active) {
    background: rgba(64, 158, 255, 0.1) !important;
    color: var(--ct-primary) !important;
  }

  /* 折叠按钮 */
  .sidebar-collapse-btn {
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--ct-text-secondary);
    border-top: 1px solid var(--ct-border);
    flex-shrink: 0;
    transition: color var(--ct-transition);
  }

  .sidebar-collapse-btn:hover {
    color: var(--ct-primary);
    background: var(--ct-bg-elevated);
  }
</style>
