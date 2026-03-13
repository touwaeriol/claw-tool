import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/setup',
    name: 'Setup',
    component: () => import('../views/SetupView.vue'),
    meta: { title: '安装向导' },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { title: '仪表盘' },
  },
  {
    path: '/providers',
    name: 'Providers',
    component: () => import('../views/ProvidersView.vue'),
    meta: { title: '供应商' },
  },
  {
    path: '/channels',
    name: 'Channels',
    component: () => import('../views/ChannelsView.vue'),
    meta: { title: '通道' },
  },
  {
    path: '/agents',
    name: 'Agents',
    component: () => import('../views/AgentsView.vue'),
    meta: { title: 'Agent' },
  },
  {
    path: '/gateway',
    name: 'Gateway',
    component: () => import('../views/GatewayView.vue'),
    meta: { title: 'Gateway' },
  },
  {
    path: '/instances',
    name: 'Instances',
    component: () => import('../views/InstancesView.vue'),
    meta: { title: '实例管理' },
  },
  {
    path: '/service',
    name: 'Service',
    component: () => import('../views/ServiceView.vue'),
    meta: { title: '服务管理' },
  },
  {
    path: '/logs',
    name: 'Logs',
    component: () => import('../views/LogsView.vue'),
    meta: { title: '日志' },
  },
  {
    path: '/test',
    name: 'Test',
    component: () => import('../views/TestView.vue'),
    meta: { title: '测试' },
  },
  {
    path: '/skills',
    name: 'Skills',
    component: () => import('../views/SkillStoreView.vue'),
    meta: { title: '技能商店' },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsView.vue'),
    meta: { title: '设置' },
  },
]

const router = createRouter({
  // NW.js 环境使用 hash 模式
  history: createWebHashHistory(),
  routes,
})

export default router
