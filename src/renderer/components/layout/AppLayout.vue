<script setup lang="ts">
  /**
   * 应用主布局组件
   * 左侧导航 + 顶部栏 + 主内容区 + 状态栏
   */
  import AppSidebar from './AppSidebar.vue'
  import AppHeader from './AppHeader.vue'
  import AppStatusBar from './AppStatusBar.vue'
</script>

<template>
  <div class="app-layout">
    <!-- 侧边栏 -->
    <AppSidebar />

    <!-- 右侧区域 -->
    <div class="app-main-area">
      <!-- 顶栏 -->
      <AppHeader />

      <!-- 内容区域 -->
      <main class="app-content">
        <router-view v-slot="{ Component }">
          <transition name="slide-right" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>

      <!-- 状态栏 -->
      <AppStatusBar />
    </div>
  </div>
</template>

<style scoped>
  .app-layout {
    width: 100%;
    height: 100%;
    display: flex;
    overflow: hidden;
  }

  .app-main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }

  .app-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background: var(--ct-bg-page);
  }
</style>
