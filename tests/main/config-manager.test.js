/**
 * ConfigManager 模块单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import JSON5 from 'json5'

const { ConfigManager } = await import('../../src/main/config-manager.js')

// 创建 mock executor
function createMockExecutor(overrides = {}) {
  return {
    getHomeDir: vi.fn(async () => '/home/testuser'),
    exists: vi.fn(async () => false),
    readFile: vi.fn(async () => '{}'),
    writeFile: vi.fn(async () => {}),
    exec: vi.fn(async () => ({ exitCode: 0, stdout: '', stderr: '' })),
    ...overrides,
  }
}

describe('ConfigManager', () => {
  let manager
  let executor

  beforeEach(() => {
    executor = createMockExecutor()
    manager = new ConfigManager(executor)
  })

  describe('getConfigPath', () => {
    it('应返回正确的配置路径', async () => {
      const configPath = await manager.getConfigPath()
      expect(configPath).toBe('/home/testuser/.openclaw/openclaw.json')
    })

    it('多次调用应返回缓存的路径', async () => {
      await manager.getConfigPath()
      await manager.getConfigPath()
      // getHomeDir 只应调用一次
      expect(executor.getHomeDir).toHaveBeenCalledTimes(1)
    })
  })

  describe('readConfig', () => {
    it('配置文件不存在时返回默认配置', async () => {
      executor.exists.mockResolvedValue(false)
      const { config, filePath } = await manager.readConfig()
      expect(config).toHaveProperty('models')
      expect(config).toHaveProperty('gateway')
      expect(config.gateway.port).toBe(18789)
      expect(filePath).toContain('openclaw.json')
    })

    it('配置文件存在时正确解析', async () => {
      const mockConfig = { models: { providers: [{ name: 'test' }] } }
      executor.exists.mockResolvedValue(true)
      executor.readFile.mockResolvedValue(JSON.stringify(mockConfig))

      const { config } = await manager.readConfig()
      expect(config.models.providers).toHaveLength(1)
      expect(config.models.providers[0].name).toBe('test')
    })
  })

  describe('writeConfig', () => {
    it('写入前应先备份', async () => {
      executor.exists.mockResolvedValue(true)
      executor.readFile.mockResolvedValue('{"old": true}')

      const newConfig = { models: { providers: [] } }
      await manager.writeConfig(newConfig)

      // 应该有备份调用（readFile 读取旧内容 + writeFile 写入 .bak）
      expect(executor.writeFile).toHaveBeenCalledTimes(2)
    })

    it('写入正确的 JSON 内容', async () => {
      executor.exists.mockResolvedValue(false) // 无需备份
      const newConfig = { test: true }
      await manager.writeConfig(newConfig)

      const writtenContent = executor.writeFile.mock.calls[0][1]
      expect(JSON5.parse(writtenContent)).toEqual({ test: true })
    })
  })

  describe('validateConfig', () => {
    it('验证成功时返回 valid: true', async () => {
      executor.exec.mockResolvedValue({ exitCode: 0, stdout: 'OK', stderr: '' })
      const result = await manager.validateConfig()
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('验证失败时返回错误信息', async () => {
      executor.exec.mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'Invalid config\nMissing field',
      })
      const result = await manager.validateConfig()
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('执行异常时返回错误', async () => {
      executor.exec.mockRejectedValue(new Error('command not found'))
      const result = await manager.validateConfig()
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('command not found')
    })
  })

  describe('_defaultConfig', () => {
    it('包含必要的配置字段', () => {
      const config = manager._defaultConfig()
      expect(config).toHaveProperty('models.providers')
      expect(config).toHaveProperty('channels')
      expect(config).toHaveProperty('gateway.port')
      expect(config).toHaveProperty('agents')
      expect(config).toHaveProperty('log.level')
    })
  })
})
