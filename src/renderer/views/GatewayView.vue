<script setup>
  /**
   * Gateway 配置页面
   * 管理端口、绑定模式、TLS、发现服务等
   */
  import { ref, computed, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useConfigStore } from '../stores/config.js'
  import { ElMessage } from 'element-plus'

  const { t } = useI18n()

  const configStore = useConfigStore()

  // 绑定模式选项（响应式，跟随语言变化）
  const bindModes = [
    { value: 'auto', label: 'auto', desc: '' },
    { value: 'lan', label: 'lan', desc: '' },
    { value: 'loopback', label: 'loopback', desc: '' },
    { value: 'custom', label: 'custom', desc: '' },
    { value: 'tailnet', label: 'Tailnet', desc: '' },
  ]

  // 表单数据（从 store 初始化）
  const form = ref({
    port: 18789,
    bind: 'auto',
    customBind: '',
    tls: false,
    tlsCert: '',
    tlsKey: '',
    auth: false,
    authToken: '',
    corsOrigins: '',
  })

  // 从 store 同步初始值
  watch(
    () => configStore.gateway,
    (gw) => {
      if (!gw) return
      form.value.port = gw.port || 18789
      form.value.bind = gw.bind || 'auto'
      form.value.customBind = gw.customBind || ''
      form.value.tls = !!gw.tls
      form.value.tlsCert = gw.tlsCert || ''
      form.value.tlsKey = gw.tlsKey || ''
      form.value.auth = !!gw.auth
      form.value.authToken = gw.authToken || ''
      form.value.corsOrigins = Array.isArray(gw.corsOrigins)
        ? gw.corsOrigins.join(', ')
        : gw.corsOrigins || ''
    },
    { immediate: true },
  )

  /** 保存 Gateway 配置 */
  function handleSave() {
    const cfg = {
      port: form.value.port,
      bind: form.value.bind,
    }

    if (form.value.bind === 'custom' && form.value.customBind) {
      cfg.customBind = form.value.customBind
    }

    if (form.value.tls) {
      cfg.tls = true
      if (form.value.tlsCert) cfg.tlsCert = form.value.tlsCert
      if (form.value.tlsKey) cfg.tlsKey = form.value.tlsKey
    }

    if (form.value.auth) {
      cfg.auth = true
      if (form.value.authToken) cfg.authToken = form.value.authToken
    }

    if (form.value.corsOrigins) {
      cfg.corsOrigins = form.value.corsOrigins
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean)
    }

    configStore.updateGateway(cfg)
    ElMessage.success(t('gatewayConfig.configUpdated'))
  }

  /** 重置为默认值 */
  function handleReset() {
    form.value = {
      port: 18789,
      bind: 'auto',
      customBind: '',
      tls: false,
      tlsCert: '',
      tlsKey: '',
      auth: false,
      authToken: '',
      corsOrigins: '',
    }
  }
</script>

<template>
  <div class="gateway-view">
    <div class="page-toolbar">
      <h3 class="page-heading">{{ $t('gatewayConfig.title') }}</h3>
      <div class="toolbar-actions">
        <el-tag v-if="configStore.isDirty" type="warning" size="small" effect="plain">
          {{ $t('common.unsavedChanges') }}
        </el-tag>
        <el-button @click="handleReset">{{ $t('common.restoreDefault') }}</el-button>
        <el-button type="primary" @click="handleSave">{{ $t('common.saveConfig') }}</el-button>
      </div>
    </div>

    <el-row :gutter="16">
      <!-- 基础设置 -->
      <el-col :span="12">
        <el-card shadow="never" class="config-card">
          <template #header>
            <span class="card-title">{{ $t('gatewayConfig.basicSettings') }}</span>
          </template>
          <el-form :model="form" label-position="top">
            <el-form-item :label="$t('gatewayConfig.listenPort')">
              <el-input-number v-model="form.port" :min="1" :max="65535" style="width: 200px" />
              <div class="form-help">{{ $t('gatewayConfig.portHelp') }}</div>
            </el-form-item>

            <el-form-item :label="$t('gatewayConfig.bindMode')">
              <el-select v-model="form.bind" style="width: 100%">
                <el-option
                  v-for="mode in bindModes"
                  :key="mode.value"
                  :label="mode.label"
                  :value="mode.value"
                >
                  <div>
                    <div>{{ mode.label }}</div>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>

            <el-form-item v-if="form.bind === 'custom'" :label="$t('gatewayConfig.customBindAddr')">
              <el-input v-model="form.customBind" placeholder="0.0.0.0" />
            </el-form-item>

            <el-form-item :label="$t('gatewayConfig.corsOrigins')">
              <el-input v-model="form.corsOrigins" placeholder="http://localhost:3000" />
              <div class="form-help">{{ $t('gatewayConfig.corsHelp') }}</div>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 安全设置 -->
      <el-col :span="12">
        <el-card shadow="never" class="config-card">
          <template #header>
            <span class="card-title">{{ $t('gatewayConfig.securitySettings') }}</span>
          </template>
          <el-form :model="form" label-position="top">
            <el-form-item :label="$t('gatewayConfig.enableTls')">
              <el-switch v-model="form.tls" />
            </el-form-item>

            <template v-if="form.tls">
              <el-form-item :label="$t('gatewayConfig.tlsCertPath')">
                <el-input v-model="form.tlsCert" placeholder="/path/to/cert.pem" />
              </el-form-item>
              <el-form-item :label="$t('gatewayConfig.tlsKeyPath')">
                <el-input v-model="form.tlsKey" placeholder="/path/to/key.pem" />
              </el-form-item>
            </template>

            <el-divider />

            <el-form-item :label="$t('gatewayConfig.enableAuth')">
              <el-switch v-model="form.auth" />
              <div class="form-help">{{ $t('gatewayConfig.authHelp') }}</div>
            </el-form-item>

            <el-form-item v-if="form.auth" :label="$t('gatewayConfig.authToken')">
              <el-input v-model="form.authToken" type="password" show-password />
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
  .gateway-view {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .page-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .page-heading {
    font-size: 18px;
    font-weight: 600;
    color: var(--ct-text-primary);
    margin: 0;
  }

  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .config-card {
    background: var(--ct-bg-card);
    border-color: var(--ct-border);
  }

  .card-title {
    font-weight: 600;
  }

  .form-help {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-top: 4px;
  }
</style>
