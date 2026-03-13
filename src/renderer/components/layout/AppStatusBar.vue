<script setup lang="ts">
/**
 * 底部状态栏组件
 * 显示 Gateway 端口、运行时间和版本信息
 */
import { ref } from 'vue'

/* placeholder 数据 */
const gatewayPort = ref(18789)
const uptime = ref('--')
const version = ref('0.0.1')
</script>

<template>
  <footer class="app-statusbar">
    <div class="statusbar-left">
      <span class="statusbar-item">
        <el-icon size="12"><ElIconLink /></el-icon>
        Gateway: {{ gatewayPort }}
      </span>
      <span class="statusbar-divider" />
      <span class="statusbar-item">
        运行时间: {{ uptime }}
      </span>
    </div>
    <div class="statusbar-right">
      <span class="statusbar-item">v{{ version }}</span>
    </div>
  </footer>
</template>

<style scoped>
.app-statusbar {
  height: var(--ct-statusbar-height);
  background: var(--ct-sidebar-bg);
  border-top: 1px solid var(--ct-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  font-size: 11px;
  color: var(--ct-text-secondary);
  flex-shrink: 0;
  user-select: none;
}

.statusbar-left,
.statusbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.statusbar-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.statusbar-divider {
  width: 1px;
  height: 12px;
  background: var(--ct-border);
}
</style>
