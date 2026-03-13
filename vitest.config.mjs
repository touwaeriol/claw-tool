import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // 测试文件匹配
    include: ['tests/**/*.test.js'],
    // 使用 node 环境（主进程测试）
    environment: 'node',
    // 覆盖率配置
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/renderer/**'],
      reporter: ['text', 'lcov'],
    },
  },
})
