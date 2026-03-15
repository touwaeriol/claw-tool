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
    meta: { title: 'menu.setup' },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { title: 'menu.dashboard' },
  },
  {
    path: '/providers',
    name: 'Providers',
    component: () => import('../views/ProvidersView.vue'),
    meta: { title: 'menu.providers' },
  },
  {
    path: '/channels',
    name: 'Channels',
    component: () => import('../views/ChannelsView.vue'),
    meta: { title: 'menu.channels' },
  },
  {
    path: '/agents',
    name: 'Agents',
    component: () => import('../views/AgentsView.vue'),
    meta: { title: 'menu.agents' },
  },
  {
    path: '/workspace',
    name: 'Workspace',
    component: () => import('../views/WorkspaceView.vue'),
    meta: { title: 'menu.workspace' },
  },
  {
    path: '/gateway',
    name: 'Gateway',
    component: () => import('../views/GatewayView.vue'),
    meta: { title: 'menu.gateway' },
  },
  {
    path: '/instances',
    name: 'Instances',
    component: () => import('../views/InstancesView.vue'),
    meta: { title: 'menu.instances' },
  },
  {
    path: '/service',
    name: 'Service',
    component: () => import('../views/ServiceView.vue'),
    meta: { title: 'menu.service' },
  },
  {
    path: '/logs',
    name: 'Logs',
    component: () => import('../views/LogsView.vue'),
    meta: { title: 'menu.logs' },
  },
  {
    path: '/test',
    name: 'Test',
    component: () => import('../views/TestView.vue'),
    meta: { title: 'menu.test' },
  },
  {
    path: '/skills',
    name: 'Skills',
    component: () => import('../views/SkillStoreView.vue'),
    meta: { title: 'menu.skills' },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsView.vue'),
    meta: { title: 'menu.settings' },
  },
]

const router = createRouter({
  // NW.js 环境使用 hash 模式
  history: createWebHashHistory(),
  routes,
})

export default router
