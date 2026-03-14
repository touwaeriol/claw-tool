<script setup lang="ts">
  /**
   * 顶部栏组件
   * 包含实例选择器、服务状态指示和全局操作按钮
   */
  import { ref } from 'vue'

  /* 当前选中的实例 */
  const currentInstance = ref('local')

  /* 实例列表（placeholder） */
  const instances = ref([{ id: 'local', label: '本地实例', type: 'local', status: 'running' }])

  /* 服务状态（placeholder） */
  const serviceRunning = ref(false)
</script>

<template>
  <header class="app-header">
    <!-- 左侧：当前页面标题 -->
    <div class="header-left">
      <h2 class="page-title">
        <slot name="title">Claw Tool</slot>
      </h2>
    </div>

    <!-- 中间：实例选择器 -->
    <div class="header-center">
      <el-select
        v-model="currentInstance"
        class="instance-selector"
        placeholder="选择实例"
        size="default"
      >
        <el-option v-for="inst in instances" :key="inst.id" :label="inst.label" :value="inst.id">
          <div class="instance-option">
            <span
              class="status-dot"
              :class="inst.status === 'running' ? 'status-dot--running' : 'status-dot--stopped'"
            />
            <span>{{ inst.label }}</span>
            <el-tag size="small" type="info" effect="plain">{{ inst.type }}</el-tag>
          </div>
        </el-option>
      </el-select>
    </div>

    <!-- 右侧：状态和操作 -->
    <div class="header-right">
      <!-- 服务状态指示 -->
      <div class="service-status">
        <span
          class="status-dot"
          :class="serviceRunning ? 'status-dot--running' : 'status-dot--stopped'"
        />
        <span class="status-text">{{ serviceRunning ? '运行中' : '已停止' }}</span>
      </div>

      <!-- 通知按钮 -->
      <el-button circle size="small" text>
        <el-icon><ElIconBell /></el-icon>
      </el-button>
    </div>
  </header>
</template>

<style scoped>
  .app-header {
    height: var(--ct-header-height);
    background: var(--ct-header-bg);
    border-bottom: 1px solid var(--ct-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    flex-shrink: 0;
    -webkit-app-region: drag; /* 允许拖动窗口 */
  }

  /* 让交互元素不拦截拖动 */
  .app-header .el-select,
  .app-header .el-button,
  .app-header .instance-selector {
    -webkit-app-region: no-drag;
  }

  .header-left {
    flex: 1;
  }

  .page-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--ct-text-primary);
  }

  .header-center {
    flex: 0 0 auto;
  }

  .instance-selector {
    width: 220px;
  }

  .instance-option {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .header-right {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
  }

  .service-status {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .status-text {
    font-size: 12px;
    color: var(--ct-text-secondary);
  }
</style>
