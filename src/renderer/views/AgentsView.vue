<script setup>
  /**
   * Agent 配置页面
   * 管理 Agent 绑定、模型选择、系统提示词等
   */
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()
</script>

<template>
  <div class="agents-view">
    <el-card>
      <template #header>{{ $t('agentsView.title') }}</template>
      <p>{{ $t('agentsView.developing') }}</p>
    </el-card>
  </div>
</template>

<style scoped>
  .agents-view {
    padding: 20px;
  }
</style>
