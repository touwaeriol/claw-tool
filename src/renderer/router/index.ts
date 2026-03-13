import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

/* 路由配置 */
const routes: RouteRecordRaw[] = [
  {
    path: '/setup',
    name: 'Setup',
    component: () => import('../views/SetupView.vue'),
    meta: { title: '安装向导', hideLayout: true },
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { title: '仪表盘', icon: 'Monitor' },
  },
  {
    path: '/providers',
    name: 'Providers',
    component: () => import('../views/ProvidersView.vue'),
    meta: { title: '供应商配置', icon: 'Connection' },
  },
  {
    path: '/channels',
    name: 'Channels',
    component: () => import('../views/ChannelsView.vue'),
    meta: { title: '通道配置', icon: 'ChatDotRound' },
  },
  {
    path: '/instances',
    name: 'Instances',
    component: () => import('../views/InstancesView.vue'),
    meta: { title: '实例管理', icon: 'OfficeBuilding' },
  },
  {
    path: '/service',
    name: 'Service',
    component: () => import('../views/ServiceView.vue'),
    meta: { title: '服务管理', icon: 'Setting' },
  },
  {
    path: '/test',
    name: 'Test',
    component: () => import('../views/TestView.vue'),
    meta: { title: '测试面板', icon: 'ChatLineSquare' },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsView.vue'),
    meta: { title: '系统设置', icon: 'Tools' },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
