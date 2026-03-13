# Claw-Tool 产品架构文档

## 1. 产品概述和目标

### 1.1 产品定位

Claw-Tool 是一个基于 NW.js + Vue 3 的跨平台桌面应用，为 OpenClaw（多通道 AI 网关）提供图形化的安装、配置和管理能力。目标用户无需掌握命令行即可完成 OpenClaw 的全生命周期管理。

### 1.2 核心目标

- **一键安装**：自动检测环境、安装 Node.js 和 OpenClaw，零配置开箱即用
- **可视化配置**：以表单方式管理 `~/.openclaw/openclaw.json`（JSON5）中的供应商、通道、Agent 等复杂配置
- **服务管理**：启动/停止/重启 OpenClaw Gateway，支持 daemon 模式和开机自启
- **状态监控**：实时展示运行状态、日志流、会话信息
- **远程测试**：内置 HTTP 服务，支持远程发送测试消息并渲染 Markdown 响应
- **多实例管理**：支持本地和远程 SSH 实例，全局切换后所有操作自动路由到对应实例
- **系统托盘**：最小化到后台运行，托盘菜单快捷操作

---

## 2. 技术架构

### 2.1 技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 桌面框架 | NW.js (0.96+) | 提供 Node.js 完整运行时 + Chromium 渲染 |
| 前端框架 | Vue 3 + Composition API | 单文件组件，响应式 UI |
| 构建工具 | Vite 6 | 开发热更新，生产构建 |
| UI 组件库 | Element Plus | 桌面风格组件库 |
| 状态管理 | Pinia | Vue 3 官方状态管理 |
| 后端服务 | Express | HTTP 远程测试服务 |
| 配置解析 | JSON5 | 兼容 OpenClaw 配置格式 |
| CSS 方案 | UnoCSS / Tailwind CSS | 原子化 CSS |
| SSH 连接 | ssh2 | 远程实例 SSH/SFTP 操作 |
| 加密存储 | crypto (Node.js 内置) | 实例密码加密存储 |
| 打包工具 | nw-builder | NW.js 跨平台打包 |

### 2.2 架构总览

```
┌──────────────────────────────────────────────────────────────┐
│                        NW.js 容器                             │
│                                                              │
│  ┌──────────────────────┐  ┌───────────────────────────────┐ │
│  │    渲染进程 (Vue 3)    │  │       Node.js 主进程           │ │
│  │                      │  │                               │ │
│  │  ┌────────────────┐  │  │  ┌─────────────────────────┐  │ │
│  │  │  页面视图       │  │  │  │  执行抽象层 (Executor)   │  │ │
│  │  │  - 安装向导     │  │  │  │                         │  │ │
│  │  │  - 实例管理     │  │  │  │  ┌─────────┐ ┌───────┐ │  │ │
│  │  │  - 配置管理     │  │  │  │  │  Local   │ │ SSH   │ │  │ │
│  │  │  - 服务控制     │  │  │  │  │ Executor │ │Executor│ │  │ │
│  │  │  - 状态监控     │  │  │  │  │(child_   │ │(ssh2) │ │  │ │
│  │  │  - 测试面板     │  │  │  │  │ process) │ │       │ │  │ │
│  │  └────────────────┘  │  │  │  └─────────┘ └───────┘ │  │ │
│  │  ┌────────────────┐  │  │  └─────────────────────────┘  │ │
│  │  │ Pinia Store    │  │  │  ┌─────────────────────────┐  │ │
│  │  │ (状态管理)      │  │  │  │ 配置文件 I/O (JSON5)    │  │ │
│  │  │ - instanceStore│  │  │  │ 本地: fs / 远程: SFTP   │  │ │
│  │  └────────────────┘  │  │  └─────────────────────────┘  │ │
│  │  ┌────────────────┐  │  │  ┌────────────┐ ┌──────────┐ │ │
│  │  │ 全局实例选择器   │  │  │  │ Express 服务│ │ 系统托盘  │ │ │
│  │  │ (顶部栏)       │  │  │  │ (远程测试)  │ │(nw.Tray) │ │ │
│  │  └────────────────┘  │  │  └────────────┘ └──────────┘ │ │
│  └──────────────────────┘  └───────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 2.3 NW.js 特性利用

NW.js 的核心优势在于渲染进程可直接访问 Node.js API，无需 IPC 桥接：

- **渲染进程**：Vue 3 应用直接 `require('child_process')`、`require('fs')` 等 Node.js 模块
- **主进程（bg-script）**：运行 Express 服务器、系统托盘、全局快捷键等后台任务
- **通信方式**：通过 `nw.Window` 共享全局对象，无需复杂 IPC

---

## 3. 模块划分和职责

### 3.1 核心模块

```
src/
├── main/                    # 主进程（bg-script）
│   ├── tray.ts              # 系统托盘管理
│   ├── express-server.ts    # HTTP 远程测试服务
│   └── index.ts             # 主进程入口
│
├── executor/                # 执行抽象层（核心）
│   ├── types.ts             # IExecutor 接口定义
│   ├── local-executor.ts    # 本地执行器（child_process + fs）
│   ├── ssh-executor.ts      # SSH 远程执行器（ssh2 + SFTP）
│   ├── executor-factory.ts  # 根据当前实例创建对应执行器
│   └── index.ts
│
├── instances/               # 实例管理
│   ├── types.ts             # 实例配置类型定义
│   ├── instance-store.ts    # 实例持久化（~/.claw-tool/instances.json）
│   ├── crypto.ts            # 密码加密/解密工具
│   ├── ssh-pool.ts          # SSH 连接池管理
│   └── index.ts
│
├── renderer/                # 渲染进程（Vue 应用）
│   ├── App.vue              # 根组件
│   ├── views/               # 页面视图
│   │   ├── SetupView.vue    # 安装向导
│   │   ├── DashboardView.vue # 仪表盘/状态总览
│   │   ├── InstancesView.vue # 实例管理
│   │   ├── ProvidersView.vue # 供应商配置
│   │   ├── ChannelsView.vue  # 通道配置
│   │   ├── AgentsView.vue    # Agent 配置
│   │   ├── GatewayView.vue   # Gateway 配置
│   │   ├── ServiceView.vue   # 服务管理
│   │   ├── LogsView.vue      # 日志查看
│   │   ├── TestView.vue      # 测试面板
│   │   └── SettingsView.vue  # 应用设置
│   │
│   ├── components/          # 公共组件
│   │   ├── layout/          # 布局组件（侧边栏、顶栏、实例选择器）
│   │   ├── config/          # 配置相关组件（表单、编辑器）
│   │   ├── instances/       # 实例相关组件（连接表单、状态指示器）
│   │   └── common/          # 通用组件（状态标签、日志流）
│   │
│   ├── stores/              # Pinia 状态仓库
│   │   ├── app.ts           # 应用全局状态
│   │   ├── instances.ts     # 实例管理状态
│   │   ├── config.ts        # OpenClaw 配置状态
│   │   ├── service.ts       # 服务运行状态
│   │   └── logs.ts          # 日志状态
│   │
│   ├── composables/         # 组合式函数
│   │   ├── useExecutor.ts   # 获取当前实例的执行器
│   │   ├── useOpenClaw.ts   # OpenClaw CLI 封装（通过执行器）
│   │   ├── useConfig.ts     # 配置文件读写（通过执行器）
│   │   ├── useProcess.ts    # 进程管理（通过执行器）
│   │   └── useNodeCheck.ts  # Node.js 环境检测（通过执行器）
│   │
│   └── router/              # Vue Router
│       └── index.ts
│
├── shared/                  # 主进程和渲染进程共享
│   ├── types.ts             # 类型定义
│   ├── constants.ts         # 常量
│   └── ipc.ts               # 进程间通信约定
│
└── assets/                  # 静态资源
    ├── icons/               # 应用图标和托盘图标
    └── styles/              # 全局样式
```

### 3.2 模块职责详述

#### 3.2.1 安装模块 (SetupView)

| 职责 | 说明 |
|------|------|
| Node.js 检测 | 执行 `node --version` 检查版本 >= 22.12.0 |
| Node.js 安装 | 引导用户安装或自动下载安装 Node.js |
| npm 检测 | 验证 npm 可用性 |
| OpenClaw 安装 | 执行 `npm install -g openclaw` |
| 安装验证 | 执行 `openclaw doctor` 验证安装结果 |
| 初始引导 | 执行 `openclaw onboard` 完成初始化配置 |

#### 3.2.2 配置管理模块 (Providers/Channels/Agents/Gateway View)

| 职责 | 说明 |
|------|------|
| 配置文件读写 | 读写 `~/.openclaw/openclaw.json` (JSON5) |
| 供应商管理 | 管理 AI 供应商：OpenAI、Anthropic、Google、Ollama、Bedrock、Copilot 等 |
| 通道管理 | 管理通信通道：Telegram、Discord、Slack、WhatsApp、Signal、LINE、Matrix、IRC、iMessage、MS Teams 等 |
| Agent 配置 | 管理 Agent 绑定、模型选择、系统提示词、并发限制等 |
| Gateway 配置 | 端口（默认 18789）、绑定模式（auto/lan/loopback/custom/tailnet）、TLS、发现服务等 |
| 配置验证 | 调用 `openclaw configure --validate` 验证配置合法性 |
| 秘钥管理 | 安全存储和展示 API Key 等敏感信息 |

#### 3.2.3 服务管理模块 (ServiceView)

| 职责 | 说明 |
|------|------|
| 启动服务 | `openclaw daemon start` / `openclaw gateway` |
| 停止服务 | `openclaw daemon stop` |
| 重启服务 | `openclaw daemon restart` |
| 状态查询 | `openclaw daemon status` |
| 服务安装 | `openclaw daemon install`（系统服务注册） |
| 服务卸载 | `openclaw daemon uninstall` |
| 生命周期监控 | 轮询或监听服务进程状态变化 |

#### 3.2.4 状态监控模块 (DashboardView + LogsView)

| 职责 | 说明 |
|------|------|
| 运行状态 | 展示 `openclaw status` 输出（版本、端口、已启用通道等） |
| 日志流 | 实时读取 `~/.openclaw/logs/` 下日志文件，支持滚动和过滤 |
| 会话信息 | 展示当前活跃的通道连接和消息统计 |
| 健康检查 | 定期调用 `openclaw doctor` 展示诊断结果 |

#### 3.2.5 测试模块 (TestView)

| 职责 | 说明 |
|------|------|
| 本地测试 | 向 Gateway (localhost:18789) 发送测试请求 |
| 响应渲染 | Markdown 渲染 AI 回复消息 |
| 远程测试 | 通过内置 Express 服务提供 HTTP 接口供远程访问 |

#### 3.2.6 系统托盘模块

| 职责 | 说明 |
|------|------|
| 托盘图标 | 根据服务状态切换图标（运行中/已停止/错误） |
| 快捷菜单 | 启动/停止服务、打开主窗口、退出应用 |
| 窗口管理 | 关闭按钮最小化到托盘而非退出 |

#### 3.2.7 实例管理模块 (InstancesView + executor/)

| 职责 | 说明 |
|------|------|
| 实例 CRUD | 添加/编辑/删除远程实例，默认内置本地实例 |
| SSH 认证 | 支持密码认证和私钥认证（支持 passphrase） |
| 连接测试 | 验证 SSH 连通性和远程 Node.js/OpenClaw 环境 |
| 全局切换 | 顶部栏实例选择器，切换后所有模块自动路由到对应实例 |
| 连接池 | SSH 连接复用，超时自动断开和重连 |
| 密码加密 | 使用 AES-256-GCM 加密存储实例密码 |
| 实例持久化 | 保存到 `~/.claw-tool/instances.json` |

---

## 4. 页面/视图设计

### 4.1 整体布局

```
┌──────────────────────────────────────────────────────────┐
│  顶部栏：应用标题 / [实例选择器 ▼] / 状态指示 / 设置      │
├──────────┬───────────────────────────────────────────────┤
│          │                                               │
│  侧边栏   │              主内容区域                        │
│          │                                               │
│  仪表盘   │                                               │
│  实例     │                                               │
│  供应商   │                                               │
│  通道     │                                               │
│  Agent   │                                               │
│  Gateway │                                               │
│  服务     │                                               │
│  日志     │                                               │
│  测试     │                                               │
│          │                                               │
├──────────┴───────────────────────────────────────────────┤
│  状态栏：当前实例 / Gateway 端口 / 服务运行时间 / 版本     │
└──────────────────────────────────────────────────────────┘
```

### 4.2 页面流程

```
应用启动
  │
  ├─ 首次使用 ──→ 安装向导（SetupView）
  │                 ├─ 步骤1：检测 Node.js
  │                 ├─ 步骤2：安装 OpenClaw
  │                 ├─ 步骤3：初始配置（onboard）
  │                 └─ 步骤4：启动 Gateway
  │
  └─ 已安装 ────→ 仪表盘（DashboardView）
                    ├─ 状态总览卡片
                    ├─ 快捷操作按钮
                    └─ 最近日志摘要
```

### 4.3 各页面功能要点

| 页面 | 关键功能 |
|------|---------|
| 仪表盘 | 服务状态卡片、已启用通道列表、快捷启停按钮、健康检查结果、当前实例信息 |
| 实例管理 | 实例列表（本地+远程）、添加/编辑实例表单、连接测试、SSH 密钥管理 |
| 供应商配置 | 供应商列表（卡片式）、API Key 输入、模型别名管理、连通性测试 |
| 通道配置 | 通道开关、各通道独立配置表单（Token/Bot ID/Webhook 等）、允许列表 |
| Agent 配置 | Agent 绑定关系、模型选择、系统提示词编辑器、并发限制 |
| Gateway 配置 | 端口设置、绑定模式选择、TLS 配置、发现服务开关 |
| 服务管理 | 启动/停止/重启按钮、Daemon 安装/卸载、进程信息、自动重启策略 |
| 日志查看 | 实时日志流、日志级别过滤、关键词搜索、日志文件切换 |
| 测试面板 | 消息输入框、发送按钮、Markdown 渲染的回复展示、历史对话 |
| 应用设置 | 语言、主题、开机自启、远程测试服务端口 |

---

## 5. 数据流和状态管理方案

### 5.1 Pinia Store 设计

#### instanceStore — 实例管理状态

```typescript
interface Instance {
  id: string                    // 唯一标识（UUID）
  name: string                  // 显示名称
  type: 'local' | 'ssh'        // 实例类型
  host?: string                 // SSH 主机地址
  port?: number                 // SSH 端口（默认 22）
  username?: string             // SSH 用户名
  authType?: 'password' | 'key' // 认证方式
  encryptedPassword?: string    // 加密后的密码
  privateKeyPath?: string       // 私钥文件路径
  passphrase?: string           // 私钥密码（加密存储）
  isDefault?: boolean           // 是否为默认实例
}

interface InstanceState {
  instances: Instance[]          // 所有实例列表
  activeInstanceId: string       // 当前选中实例 ID
  connectionStatus: Record<string, 'connected' | 'disconnected' | 'connecting' | 'error'>
}
```

#### appStore — 应用全局状态

```typescript
interface AppState {
  isFirstRun: boolean          // 是否首次运行
  openclawInstalled: boolean   // OpenClaw 是否已安装（当前实例）
  nodeVersion: string | null   // Node.js 版本（当前实例）
  openclawVersion: string | null // OpenClaw 版本（当前实例）
  theme: 'light' | 'dark'     // 主题
  locale: string               // 语言
}
```

#### configStore — OpenClaw 配置状态

```typescript
interface ConfigState {
  raw: object | null           // 原始 JSON5 配置对象
  filePath: string             // 配置文件路径 (~/.openclaw/openclaw.json)
  lastLoaded: number           // 上次加载时间戳
  isDirty: boolean             // 是否有未保存的修改
  validationErrors: string[]   // 验证错误列表
}
```

#### serviceStore — 服务运行状态

```typescript
interface ServiceState {
  gatewayRunning: boolean      // Gateway 是否运行中
  gatewayPid: number | null    // Gateway 进程 PID
  gatewayPort: number          // Gateway 端口
  daemonInstalled: boolean     // Daemon 是否已安装为系统服务
  uptime: number               // 运行时长（秒）
  activeChannels: string[]     // 已连接的通道列表
}
```

#### logsStore — 日志状态

```typescript
interface LogsState {
  entries: LogEntry[]          // 日志条目
  level: 'debug' | 'info' | 'warn' | 'error'  // 过滤级别
  searchKeyword: string        // 搜索关键词
  autoScroll: boolean          // 是否自动滚动到底部
}
```

### 5.2 数据流向

```
                        instanceStore
                     (当前活跃实例选择)
                            │
                            ▼
                    ┌───────────────┐
                    │ Executor 抽象层 │
                    │               │
                    │ Local / SSH   │
                    └───────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        配置文件 I/O    CLI 命令执行    日志文件读取
        (fs / SFTP)  (child_process  (fs / SFTP)
                      / ssh.exec)
              │             │             │
              ▼             ▼             ▼
         configStore   serviceStore   logsStore
              │             │             │
              ▼             ▼             ▼
         配置表单视图   状态/服务视图   日志视图
         (双向绑定)    (单向展示)    (单向展示)
```

### 5.3 配置文件读写策略

1. **读取**：应用启动时和手动刷新时，使用 `fs.readFileSync` + `JSON5.parse` 加载配置
2. **写入**：用户保存时，使用 `JSON5.stringify` + `fs.writeFileSync` 原子写入
3. **文件监听**：使用 `fs.watch` 监听配置文件变化，检测外部修改并提示用户
4. **备份**：写入前自动创建 `.bak` 备份文件
5. **验证**：写入前调用 `openclaw configure --validate` 验证

---

## 6. 主进程和渲染进程通信方案

### 6.1 NW.js 通信模型

NW.js 不同于 Electron 的严格进程隔离。在 NW.js 中：

- **渲染进程可直接使用 Node.js API**：`require('child_process')`、`require('fs')` 等
- **bg-script（主进程）和渲染进程共享 Node.js 上下文**

因此，通信方案以**共享模块实例**为核心，而非 IPC：

### 6.2 通信方式

#### 方式一：共享服务单例（推荐）

```typescript
// shared/services.ts — 在 bg-script 中初始化，渲染进程直接 import
import { OpenClawService } from './openclaw-service'
import { TrayService } from './tray-service'
import { ExpressService } from './express-service'

export const openclawService = new OpenClawService()
export const trayService = new TrayService()
export const expressService = new ExpressService()
```

#### 方式二：EventEmitter 事件总线

```typescript
// shared/event-bus.ts
import { EventEmitter } from 'events'
export const eventBus = new EventEmitter()

// 主进程发布事件
eventBus.emit('service:status-changed', { running: true, pid: 12345 })

// 渲染进程监听事件
eventBus.on('service:status-changed', (status) => {
  serviceStore.update(status)
})
```

#### 方式三：nw.Window 全局对象

```typescript
// bg-script 中挂载
nw.global.expressServer = expressServer

// 渲染进程中访问
const server = nw.global.expressServer
```

### 6.3 推荐策略

| 场景 | 通信方式 |
|------|---------|
| 本地配置读写、CLI 调用 | 渲染进程通过 LocalExecutor 直接调用 Node.js API |
| 远程配置读写、CLI 调用 | 渲染进程通过 SshExecutor（ssh2）执行远程操作 |
| 实例切换通知 | Pinia instanceStore 响应式 + EventEmitter 事件总线 |
| 服务状态变化通知 | EventEmitter 事件总线 |
| 托盘菜单操作触发 UI 更新 | EventEmitter 事件总线 |
| Express 服务控制 | 共享服务单例 |

---

## 7. HTTP 远程测试服务设计

### 7.1 用途

用户可能在远程机器上运行 claw-tool，需要通过浏览器或 API 客户端远程发送测试消息。内置 Express 服务提供 HTTP 接口和简易 Web UI。

### 7.2 接口设计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 简易 Web 测试页面（HTML） |
| GET | `/api/status` | 获取 OpenClaw 运行状态 |
| POST | `/api/test` | 发送测试消息到 Gateway |
| GET | `/api/config/summary` | 获取配置摘要（脱敏） |
| GET | `/api/logs` | 获取最近日志（分页） |
| WebSocket | `/ws/logs` | 实时日志推送 |

### 7.3 测试消息接口

```
POST /api/test
Content-Type: application/json

{
  "message": "你好，请介绍一下自己",
  "provider": "anthropic",    // 可选，指定供应商
  "model": "sonnet",          // 可选，指定模型别名
  "stream": false             // 可选，是否流式响应
}

Response:
{
  "ok": true,
  "reply": "你好！我是...",     // AI 回复（原始文本）
  "replyHtml": "<p>你好！...</p>",  // Markdown 渲染后的 HTML
  "usage": { "input": 12, "output": 45 },
  "latencyMs": 1234
}
```

### 7.4 安全考虑

- 默认仅绑定 `127.0.0.1`，远程访问需用户手动开启并确认
- 支持可选的 Bearer Token 认证
- 不暴露完整配置，仅提供脱敏摘要
- 配置界面中可设置允许访问的 IP 白名单

### 7.5 Express 服务生命周期

- 随应用启动自动创建，但默认不监听（需用户在设置中启用）
- 端口可配置，默认 `18790`（避开 Gateway 的 18789）
- 应用退出时自动关闭

---

## 8. 跨平台构建策略

### 8.1 目标平台

| 平台 | 架构 | 产物格式 |
|------|------|---------|
| Windows | amd64 | `.exe` 安装包 (NSIS / portable zip) |
| Windows | arm64 | `.exe` 安装包 (NSIS / portable zip) |
| macOS | arm64 (Apple Silicon) | `.dmg` / `.app` |

### 8.2 构建流程

```
源代码
  │
  ├─ Vite Build ──→ dist/renderer/  (Vue 应用静态文件)
  │
  ├─ TypeScript ──→ dist/main/      (主进程 JS)
  │
  └─ nw-builder ──→ 各平台安装包
       ├─ --platform win --arch x64
       ├─ --platform win --arch arm64
       └─ --platform osx --arch arm64
```

### 8.3 构建配置

```json
// package.json 构建脚本
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "pack:win-x64": "nwbuild --platform win --arch x64 --outDir release/",
    "pack:win-arm64": "nwbuild --platform win --arch arm64 --outDir release/",
    "pack:mac-arm64": "nwbuild --platform osx --arch arm64 --outDir release/",
    "pack:all": "npm run pack:win-x64 && npm run pack:win-arm64 && npm run pack:mac-arm64"
  }
}
```

### 8.4 NW.js package.json 配置

```json
{
  "name": "claw-tool",
  "main": "dist/renderer/index.html",
  "node-main": "dist/main/index.js",
  "window": {
    "title": "Claw Tool",
    "width": 1200,
    "height": 800,
    "min_width": 900,
    "min_height": 600,
    "icon": "assets/icons/icon.png"
  },
  "chromium-args": "--disable-gpu-compositing"
}
```

### 8.5 平台差异处理

| 差异项 | Windows | macOS |
|--------|---------|-------|
| Node.js 安装检测 | `where node` | `which node` |
| 全局 npm 路径 | `%APPDATA%/npm` | `/usr/local/bin` |
| 配置文件路径 | `%USERPROFILE%/.openclaw/` | `~/.openclaw/` |
| 系统托盘 | Windows 系统托盘 | macOS 菜单栏 |
| 开机自启 | 注册表 / 任务计划程序 | LaunchAgent plist |
| 进程管理 | `taskkill /PID` | `kill -TERM` |

### 8.6 CI/CD 构建

建议使用 GitHub Actions：

- Windows 构建：`windows-latest` runner
- macOS 构建：`macos-latest` runner (Apple Silicon)
- 产物上传至 GitHub Releases

---

## 9. 实例管理与执行抽象层设计

### 9.1 设计目标

所有涉及命令执行、文件读写的操作都通过统一的 **Executor 抽象层** 完成。切换实例时，只需切换 Executor 实现，上层业务逻辑无需任何修改。

### 9.2 IExecutor 接口定义

```typescript
interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
}

interface IExecutor {
  /** 执行 shell 命令 */
  exec(command: string, options?: { cwd?: string; timeout?: number }): Promise<ExecResult>

  /** 读取远程/本地文件内容 */
  readFile(path: string, encoding?: string): Promise<string>

  /** 写入远程/本地文件 */
  writeFile(path: string, content: string): Promise<void>

  /** 检查文件/目录是否存在 */
  exists(path: string): Promise<boolean>

  /** 获取用户 home 目录 */
  getHomeDir(): Promise<string>

  /** 测试连接可用性 */
  ping(): Promise<boolean>

  /** 释放资源（关闭 SSH 连接等） */
  dispose(): Promise<void>
}
```

### 9.3 LocalExecutor（本地执行器）

```typescript
class LocalExecutor implements IExecutor {
  // exec → child_process.exec / execFile
  // readFile → fs.promises.readFile
  // writeFile → fs.promises.writeFile
  // exists → fs.promises.access
  // getHomeDir → os.homedir()
  // ping → 始终返回 true
  // dispose → 无操作
}
```

### 9.4 SshExecutor（SSH 远程执行器）

```typescript
class SshExecutor implements IExecutor {
  private client: ssh2.Client
  private sftp: ssh2.SFTPWrapper

  // exec → client.exec(command)
  // readFile → sftp.readFile(path)
  // writeFile → sftp.writeFile(path, content)
  // exists → sftp.stat(path)
  // getHomeDir → exec('echo $HOME')
  // ping → 尝试 exec('echo ok')
  // dispose → client.end()
}
```

### 9.5 ExecutorFactory（执行器工厂）

```typescript
class ExecutorFactory {
  private pool: Map<string, SshExecutor> = new Map()

  getExecutor(instance: Instance): IExecutor {
    if (instance.type === 'local') {
      return new LocalExecutor()
    }
    // 从连接池获取或创建新的 SSH 执行器
    if (!this.pool.has(instance.id)) {
      this.pool.set(instance.id, new SshExecutor(instance))
    }
    return this.pool.get(instance.id)!
  }

  async disposeAll(): Promise<void> {
    for (const executor of this.pool.values()) {
      await executor.dispose()
    }
    this.pool.clear()
  }
}
```

### 9.6 上层使用方式（Composable）

```typescript
// composables/useExecutor.ts
export function useExecutor(): IExecutor {
  const instanceStore = useInstanceStore()
  const factory = inject<ExecutorFactory>('executorFactory')
  return factory.getExecutor(instanceStore.activeInstance)
}

// composables/useOpenClaw.ts — 所有 CLI 操作通过执行器
export function useOpenClaw() {
  const executor = useExecutor()

  async function getStatus() {
    const result = await executor.exec('openclaw status --json')
    return JSON.parse(result.stdout)
  }

  async function daemonStart() {
    return executor.exec('openclaw daemon start')
  }

  // ...其他命令封装
}

// composables/useConfig.ts — 配置文件读写通过执行器
export function useConfig() {
  const executor = useExecutor()

  async function loadConfig() {
    const homeDir = await executor.getHomeDir()
    const configPath = `${homeDir}/.openclaw/openclaw.json`
    const content = await executor.readFile(configPath)
    return JSON5.parse(content)
  }

  async function saveConfig(config: object) {
    const homeDir = await executor.getHomeDir()
    const configPath = `${homeDir}/.openclaw/openclaw.json`
    await executor.writeFile(configPath, JSON5.stringify(config, null, 2))
  }
}
```

### 9.7 实例配置存储

实例配置保存在本地 `~/.claw-tool/instances.json`：

```json5
{
  "encryptionKeyId": "random-generated-key-id",
  "instances": [
    {
      "id": "local",
      "name": "本地",
      "type": "local",
      "isDefault": true
    },
    {
      "id": "a1b2c3d4",
      "name": "生产服务器",
      "type": "ssh",
      "host": "192.168.1.100",
      "port": 22,
      "username": "deploy",
      "authType": "key",
      "privateKeyPath": "~/.ssh/id_ed25519"
    },
    {
      "id": "e5f6g7h8",
      "name": "测试服务器",
      "type": "ssh",
      "host": "10.0.0.50",
      "port": 22,
      "username": "admin",
      "authType": "password",
      "encryptedPassword": "aes-256-gcm:iv:tag:ciphertext"
    }
  ]
}
```

### 9.8 密码加密方案

使用 Node.js 内置 `crypto` 模块，AES-256-GCM 对称加密：

- **加密密钥**：首次运行时随机生成 256 位密钥，存储在 `~/.claw-tool/.keystore`（文件权限 0600）
- **加密流程**：随机 IV + AES-256-GCM 加密 + 输出格式 `iv:authTag:ciphertext`（Base64）
- **Windows 密钥保护**：使用 DPAPI（`crypto.protectData`）额外加密密钥文件
- **macOS 密钥保护**：可选存入 Keychain

### 9.9 SSH 连接池管理

```typescript
class SshConnectionPool {
  private connections: Map<string, { client: ssh2.Client; lastUsed: number }>

  /** 获取或创建连接 */
  async acquire(instance: Instance): Promise<ssh2.Client>

  /** 释放连接（归还到池中） */
  release(instanceId: string): void

  /** 心跳检测，清理超时连接（默认 5 分钟无操作断开） */
  startHealthCheck(intervalMs?: number): void

  /** 关闭所有连接 */
  async disposeAll(): Promise<void>
}
```

### 9.10 实例切换流程

```
用户在顶部栏选择实例
        │
        ▼
  instanceStore.setActive(id)
        │
        ▼
  ExecutorFactory 返回对应 Executor
        │
        ▼
  触发所有依赖 Store 重新加载
  ├─ configStore.reload()    → executor.readFile(配置文件)
  ├─ serviceStore.refresh()  → executor.exec('openclaw status')
  └─ logsStore.clear()       → 准备加载新实例日志
        │
        ▼
  UI 自动更新（响应式）
```

---

## 附录：OpenClaw CLI 命令参考

以下是 claw-tool 需要封装调用的核心 CLI 命令：

| 命令 | 用途 | 对应模块 |
|------|------|---------|
| `openclaw onboard` | 初始引导配置 | 安装向导 |
| `openclaw gateway` | 前台启动 Gateway | 服务管理 |
| `openclaw configure` | 配置管理 | 配置模块 |
| `openclaw configure --validate` | 验证配置 | 配置模块 |
| `openclaw status` | 查看运行状态 | 状态监控 |
| `openclaw doctor` | 环境诊断 | 安装向导/仪表盘 |
| `openclaw daemon start` | 后台启动 | 服务管理 |
| `openclaw daemon stop` | 后台停止 | 服务管理 |
| `openclaw daemon restart` | 后台重启 | 服务管理 |
| `openclaw daemon status` | 后台状态 | 服务管理 |
| `openclaw daemon install` | 安装系统服务 | 服务管理 |
| `openclaw daemon uninstall` | 卸载系统服务 | 服务管理 |
