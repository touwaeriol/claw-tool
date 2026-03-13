<script setup>
/**
 * 实例管理页面
 * 本地 + 远程 SSH 实例列表，连接管理
 */
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useInstanceStore } from '../stores/instance.js'

const instanceStore = useInstanceStore()

/* 添加实例弹窗 */
const dialogVisible = ref(false)
const formRef = ref(null)
const testResult = ref(null)
const saving = ref(false)

const newInstance = ref({
  name: '',
  host: '',
  port: 22,
  username: 'root',
  authType: 'password',
  password: '',
  privateKeyPath: '',
  passphrase: '',
})

/* 表单验证规则 */
const rules = {
  name: [{ required: true, message: '请输入实例名称', trigger: 'blur' }],
  host: [{ required: true, message: '请输入主机地址', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
}

onMounted(() => {
  instanceStore.loadInstances()
})

function handleAddInstance() {
  newInstance.value = {
    name: '',
    host: '',
    port: 22,
    username: 'root',
    authType: 'password',
    password: '',
    privateKeyPath: '',
    passphrase: '',
  }
  testResult.value = null
  dialogVisible.value = true
}

/* 测试连接 */
async function handleTestConnection() {
  testResult.value = null
  try {
    const result = await instanceStore.testConnection({
      host: newInstance.value.host,
      port: newInstance.value.port,
      username: newInstance.value.username,
      authType: newInstance.value.authType,
      password: newInstance.value.password,
      privateKeyPath: newInstance.value.privateKeyPath,
      passphrase: newInstance.value.passphrase,
    })
    testResult.value = result
    if (result.success) {
      ElMessage.success('SSH 连接成功')
    } else {
      ElMessage.error(result.message)
    }
  } catch (err) {
    testResult.value = { success: false, message: err.message }
    ElMessage.error(`测试失败: ${err.message}`)
  }
}

/* 保存实例 */
async function handleSaveInstance() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    await instanceStore.addInstance(newInstance.value)
    ElMessage.success('实例添加成功')
    dialogVisible.value = false
  } catch (err) {
    ElMessage.error(`添加失败: ${err.message}`)
  } finally {
    saving.value = false
  }
}

/* 连接实例 */
async function handleConnect(instance) {
  try {
    await instanceStore.connectInstance(instance.id)
    ElMessage.success(`已连接到 ${instance.name}`)
  } catch (err) {
    ElMessage.error(`连接失败: ${err.message}`)
  }
}

/* 断开连接 */
async function handleDisconnect(instance) {
  await instanceStore.disconnectInstance(instance.id)
  ElMessage.info(`已断开 ${instance.name}`)
}

/* 删除实例 */
async function handleDelete(instance) {
  try {
    await ElMessageBox.confirm(
      `确定要删除实例 "${instance.name}" 吗？此操作不可撤销。`,
      '确认删除',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
    )
    await instanceStore.deleteInstance(instance.id)
    ElMessage.success('实例已删除')
  } catch {
    // 用户取消
  }
}

/* 设置为活跃实例 */
function handleSelectInstance(id) {
  instanceStore.setActiveInstance(id)
}

/* 获取状态标签类型 */
function getStatusType(id) {
  const status = instanceStore.connectionStatus[id]
  if (status === 'connected') return 'success'
  if (status === 'connecting') return 'warning'
  if (status === 'error') return 'danger'
  return 'info'
}

/* 获取状态文本 */
function getStatusText(id) {
  const status = instanceStore.connectionStatus[id]
  const map = {
    connected: '已连接',
    connecting: '连接中...',
    disconnected: '未连接',
    error: '连接错误',
  }
  return map[status] || '未知'
}
</script>

<template>
  <div class="instances-view">
    <!-- 页面标题 -->
    <div class="page-toolbar">
      <h3 class="page-heading">实例管理</h3>
      <el-button type="primary" @click="handleAddInstance">
        添加远程实例
      </el-button>
    </div>

    <!-- 实例卡片列表 -->
    <div class="instance-list">
      <el-card
        v-for="inst in instanceStore.instances"
        :key="inst.id"
        class="instance-card hover-card"
        shadow="never"
        :class="{ 'is-active': instanceStore.activeInstanceId === inst.id }"
        @click="handleSelectInstance(inst.id)"
      >
        <div class="instance-main">
          <!-- 状态图标 -->
          <div class="instance-icon">
            <el-icon :size="32" :color="inst.type === 'local' ? 'var(--ct-primary)' : 'var(--ct-warning)'">
              <ElIconMonitor v-if="inst.type === 'local'" />
              <ElIconConnection v-else />
            </el-icon>
          </div>

          <!-- 信息 -->
          <div class="instance-info">
            <div class="instance-name">
              {{ inst.name }}
              <el-tag v-if="inst.type === 'local'" size="small" effect="plain" type="info">本地</el-tag>
              <el-tag v-else size="small" effect="plain" type="warning">SSH</el-tag>
              <el-tag
                v-if="instanceStore.activeInstanceId === inst.id"
                size="small"
                effect="dark"
                type="primary"
              >
                当前
              </el-tag>
            </div>
            <div class="instance-detail">
              <span v-if="inst.type === 'ssh'">{{ inst.username }}@{{ inst.host }}:{{ inst.port || 22 }}</span>
              <span v-else>localhost</span>
            </div>
            <div class="instance-meta">
              <span
                class="status-dot"
                :class="{
                  'status-dot--running': instanceStore.connectionStatus[inst.id] === 'connected',
                  'status-dot--stopped': instanceStore.connectionStatus[inst.id] === 'disconnected' || instanceStore.connectionStatus[inst.id] === 'error',
                  'status-dot--unknown': instanceStore.connectionStatus[inst.id] === 'connecting',
                }"
              />
              <span class="instance-status">{{ getStatusText(inst.id) }}</span>
              <span v-if="inst.authType === 'key'" class="instance-auth">
                密钥认证
              </span>
              <span v-else-if="inst.type === 'ssh'" class="instance-auth">
                密码认证
              </span>
            </div>
          </div>

          <!-- 操作 -->
          <div class="instance-actions" @click.stop>
            <el-button
              v-if="inst.type === 'ssh' && instanceStore.connectionStatus[inst.id] !== 'connected' && instanceStore.connectionStatus[inst.id] !== 'connecting'"
              text
              size="small"
              type="primary"
              @click="handleConnect(inst)"
            >
              连接
            </el-button>
            <el-button
              v-if="inst.type === 'ssh' && instanceStore.connectionStatus[inst.id] === 'connected'"
              text
              size="small"
              type="warning"
              @click="handleDisconnect(inst)"
            >
              断开
            </el-button>
            <el-button
              v-if="inst.type === 'ssh'"
              text
              size="small"
              type="danger"
              @click="handleDelete(inst)"
            >
              删除
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 空状态 -->
    <el-empty
      v-if="instanceStore.instances.length <= 1"
      description="暂无远程实例，点击上方按钮添加"
      :image-size="120"
      style="margin-top: 40px;"
    />

    <!-- 添加远程实例弹窗 -->
    <el-dialog v-model="dialogVisible" title="添加远程实例" width="520px" destroy-on-close>
      <el-form ref="formRef" :model="newInstance" :rules="rules" label-position="top">
        <el-form-item label="实例名称" prop="name">
          <el-input v-model="newInstance.name" placeholder="例如：生产服务器" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="16">
            <el-form-item label="主机地址" prop="host">
              <el-input v-model="newInstance.host" placeholder="192.168.1.100 或域名" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="SSH 端口">
              <el-input-number v-model="newInstance.port" :min="1" :max="65535" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="newInstance.username" placeholder="root" />
        </el-form-item>
        <el-form-item label="认证方式">
          <el-radio-group v-model="newInstance.authType">
            <el-radio value="password">密码</el-radio>
            <el-radio value="key">SSH 密钥</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="newInstance.authType === 'password'" label="密码">
          <el-input v-model="newInstance.password" type="password" show-password placeholder="SSH 登录密码" />
        </el-form-item>
        <template v-if="newInstance.authType === 'key'">
          <el-form-item label="私钥路径">
            <el-input v-model="newInstance.privateKeyPath" placeholder="~/.ssh/id_rsa" />
          </el-form-item>
          <el-form-item label="私钥密码（可选）">
            <el-input v-model="newInstance.passphrase" type="password" show-password placeholder="如果私钥有密码则填写" />
          </el-form-item>
        </template>

        <!-- 测试结果 -->
        <el-alert
          v-if="testResult"
          :title="testResult.message"
          :type="testResult.success ? 'success' : 'error'"
          show-icon
          :closable="false"
          style="margin-bottom: 16px;"
        >
          <template v-if="testResult.success && testResult.info" #default>
            <div class="test-info">
              <div v-if="testResult.info.system">系统: {{ testResult.info.system }}</div>
              <div>Node.js: {{ testResult.info.nodeVersion || '未安装' }}</div>
              <div>OpenClaw: {{ testResult.info.openclawVersion || '未安装' }}</div>
            </div>
          </template>
        </el-alert>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button
            :loading="instanceStore.testing"
            @click="handleTestConnection"
          >
            测试连接
          </el-button>
          <el-button
            type="primary"
            :loading="saving"
            @click="handleSaveInstance"
          >
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.instances-view {
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
}

/* 实例列表 */
.instance-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.instance-card {
  background: var(--ct-bg-card);
  border-color: var(--ct-border);
  cursor: pointer;
  transition: border-color var(--ct-transition);
}

.instance-card.is-active {
  border-color: var(--ct-primary);
}

.instance-main {
  display: flex;
  align-items: center;
  gap: 16px;
}

.instance-icon {
  flex-shrink: 0;
}

.instance-info {
  flex: 1;
  min-width: 0;
}

.instance-name {
  font-weight: 600;
  font-size: 15px;
  color: var(--ct-text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.instance-detail {
  font-size: 13px;
  color: var(--ct-text-secondary);
  margin-top: 2px;
  font-family: monospace;
}

.instance-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 12px;
}

.instance-status {
  color: var(--ct-text-secondary);
}

.instance-auth {
  color: var(--ct-text-placeholder);
}

.instance-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.test-info {
  font-size: 12px;
  line-height: 1.8;
  color: var(--ct-text-secondary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
