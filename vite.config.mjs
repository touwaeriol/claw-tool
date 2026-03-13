import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    // Element Plus 按需自动导入（组件 + API）
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
    // 构建分析（仅在 analyze 模式下启用）
    mode === 'analyze' && visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
    },
  },
  root: 'src/renderer',
  base: './',
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    // Element Plus 按需导入后仍较大，NW.js 桌面应用本地加载可接受
    chunkSizeWarningLimit: 1000,
    // CSS 代码分割
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // 手动分包策略：将第三方库与业务代码分离，利于缓存
        manualChunks(id) {
          // Vue 核心库
          if (id.includes('node_modules/vue/') ||
              id.includes('node_modules/vue-router/') ||
              id.includes('node_modules/pinia/') ||
              id.includes('node_modules/@vue/')) {
            return 'vendor-vue'
          }
          // Element Plus（按需导入，但组件间共享代码较多）
          if (id.includes('node_modules/element-plus/')) {
            return 'vendor-element'
          }
          // markdown-it 和 xterm 通过 NW.js 的 window.require 加载，不参与 Vite 打包
        },
      },
    },
    // 使用 esbuild 压缩（比 terser 快）
    minify: 'esbuild',
    // 生产环境移除 console.log 和 debugger
    esbuild: mode === 'development' ? {} : {
      drop: ['console', 'debugger'],
    },
  },
  server: {
    port: 5173,
  },
}))
