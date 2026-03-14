<script setup lang="ts">
/**
 * 侧边栏导航组件
 * 支持折叠，菜单文本国际化
 */
import { useRoute, useRouter } from 'vue-router'
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

/* 折叠状态 */
const isCollapsed = ref(false)

/* 导航菜单项（label 使用 i18n key） */
const menuItems = [
  { path: '/dashboard', labelKey: 'menu.dashboard', icon: 'Odometer' },
  { path: '/providers', labelKey: 'menu.providers', icon: 'Connection' },
  { path: '/channels', labelKey: 'menu.channels', icon: 'ChatDotRound' },
  { path: '/agents', labelKey: 'menu.agents', icon: 'User' },
  { path: '/workspace', labelKey: 'menu.workspace', icon: 'Files' },
  { path: '/gateway', labelKey: 'menu.gateway', icon: 'Switch' },
  { path: '/instances', labelKey: 'menu.instances', icon: 'OfficeBuilding' },
  { path: '/service', labelKey: 'menu.service', icon: 'Monitor' },
  { path: '/logs', labelKey: 'menu.logs', icon: 'Document' },
  { path: '/test', labelKey: 'menu.test', icon: 'Promotion' },
  { path: '/skills', labelKey: 'menu.skills', icon: 'ShoppingCart' },
  { path: '/settings', labelKey: 'menu.settings', icon: 'Setting' },
]

const activeMenu = computed(() => route.path)

function navigateTo(path: string) {
  router.push(path)
}

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <el-aside :width="isCollapsed ? '64px' : '180px'" class="sidebar">
    <!-- Logo 区域 -->
    <div class="sidebar-logo" @click="navigateTo('/dashboard')">
      <span v-if="!isCollapsed" class="logo-text">Claw Tool</span>
      <span v-else class="logo-icon">CT</span>
    </div>

    <!-- 导航菜单 -->
    <el-menu
      :default-active="activeMenu"
      :collapse="isCollapsed"
      :collapse-transition="true"
      class="sidebar-menu"
      @select="navigateTo"
    >
      <el-menu-item
        v-for="item in menuItems"
        :key="item.path"
        :index="item.path"
      >
        <el-icon><component :is="'ElIcon' + item.icon" /></el-icon>
        <template #title>{{ t(item.labelKey) }}</template>
      </el-menu-item>
    </el-menu>

    <!-- 折叠按钮 -->
    <div class="sidebar-collapse-btn" @click="toggleCollapse">
      <el-icon :size="14">
        <ElIconDArrowLeft v-if="!isCollapsed" />
        <ElIconDArrowRight v-else />
      </el-icon>
    </div>
  </el-aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--ct-border, var(--el-border-color));
  background: var(--ct-sidebar-bg, var(--el-bg-color));
  overflow: hidden;
  transition: width 0.25s ease;
}

/* Logo */
.sidebar-logo {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-bottom: 1px solid var(--ct-border, var(--el-border-color));
  flex-shrink: 0;
}

.logo-text {
  font-size: 16px;
  font-weight: 700;
  color: var(--ct-primary, var(--el-color-primary));
  letter-spacing: 0.5px;
}

.logo-icon {
  font-size: 16px;
  font-weight: 700;
  color: var(--ct-primary, var(--el-color-primary));
}

/* 菜单 */
.sidebar-menu {
  flex: 1;
  border-right: none !important;
  overflow-y: auto;
}

.sidebar-menu :deep(.el-menu-item) {
  height: 42px;
  line-height: 42px;
  margin: 2px 6px;
  border-radius: 4px;
}

.sidebar-menu :deep(.el-menu-item:hover) {
  background: var(--ct-bg-elevated, rgba(0,0,0,0.06)) !important;
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  background: rgba(64, 158, 255, 0.1) !important;
  color: var(--ct-primary, var(--el-color-primary)) !important;
}

/* 折叠按钮 */
.sidebar-collapse-btn {
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--ct-text-secondary, var(--el-text-color-secondary));
  border-top: 1px solid var(--ct-border, var(--el-border-color));
  flex-shrink: 0;
  transition: color 0.2s, background 0.2s;
}

.sidebar-collapse-btn:hover {
  color: var(--ct-primary, var(--el-color-primary));
  background: var(--ct-bg-elevated, rgba(0,0,0,0.06));
}
</style>
