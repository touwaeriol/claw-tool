<script setup>
  /**
   * Gateway 配置页面
   * 管理端口、绑定模式、TLS、发现服务等
   */
  import { ref, computed, watch } from 'vue'
  import { useConfigStore } from '../stores/config.js'
  import { ElMessage } from 'element-plus'

  const configStore = useConfigStore()

  // 绑定模式选项
  const bindModes = [
    { value: 'auto', label: '自动 (auto)', desc: '自动选择最佳绑定方式' },
    { value: 'lan', label: '局域网 (lan)', desc: '绑定到局域网 IP，局域网内设备可访问' },
    { value: 'loopback', label: '仅本机 (loopback)', desc: '仅绑定 127.0.0.1，最安全' },
    { value: 'custom', label: '自定义 (custom)', desc: '指定自定义绑定地址' },
    { value: 'tailnet', label: 'Tailnet', desc: '通过 Tailscale 网络绑定' },
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
    ElMessage.success('Gateway 配置已更新')
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
      <h3 class="page-heading">Gateway 配置</h3>
      <div class="toolbar-actions">
        <el-tag v-if="configStore.isDirty" type="warning" size="small" effect="plain">
          有未保存的修改
        </el-tag>
        <el-button @click="handleReset">恢复默认</el-button>
        <el-button type="primary" @click="handleSave">保存配置</el-button>
      </div>
    </div>

    <el-row :gutter="16">
      <!-- 基础设置 -->
      <el-col :span="12">
        <el-card shadow="never" class="config-card">
          <template #header>
            <span class="card-title">基础设置</span>
          </template>
          <el-form :model="form" label-position="top">
            <el-form-item label="监听端口">
              <el-input-number v-model="form.port" :min="1" :max="65535" style="width: 200px" />
              <div class="form-help">默认 18789，修改后需重启 Gateway</div>
            </el-form-item>

            <el-form-item label="绑定模式">
              <el-select v-model="form.bind" style="width: 100%">
                <el-option
                  v-for="mode in bindModes"
                  :key="mode.value"
                  :label="mode.label"
                  :value="mode.value"
                >
                  <div>
                    <div>{{ mode.label }}</div>
                    <div style="font-size: 12px; color: var(--el-text-color-secondary)">
                      {{ mode.desc }}
                    </div>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>

            <el-form-item v-if="form.bind === 'custom'" label="自定义绑定地址">
              <el-input v-model="form.customBind" placeholder="0.0.0.0 或具体 IP" />
            </el-form-item>

            <el-form-item label="CORS 允许的域名">
              <el-input
                v-model="form.corsOrigins"
                placeholder="逗号分隔，例如 http://localhost:3000"
              />
              <div class="form-help">留空则不设置 CORS</div>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 安全设置 -->
      <el-col :span="12">
        <el-card shadow="never" class="config-card">
          <template #header>
            <span class="card-title">安全设置</span>
          </template>
          <el-form :model="form" label-position="top">
            <el-form-item label="启用 TLS">
              <el-switch v-model="form.tls" />
            </el-form-item>

            <template v-if="form.tls">
              <el-form-item label="TLS 证书路径">
                <el-input v-model="form.tlsCert" placeholder="/path/to/cert.pem" />
              </el-form-item>
              <el-form-item label="TLS 密钥路径">
                <el-input v-model="form.tlsKey" placeholder="/path/to/key.pem" />
              </el-form-item>
            </template>

            <el-divider />

            <el-form-item label="启用认证">
              <el-switch v-model="form.auth" />
              <div class="form-help">启用后，访问 Gateway 需提供 Bearer Token</div>
            </el-form-item>

            <el-form-item v-if="form.auth" label="认证 Token">
              <el-input
                v-model="form.authToken"
                type="password"
                show-password
                placeholder="设置访问 Token"
              />
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
