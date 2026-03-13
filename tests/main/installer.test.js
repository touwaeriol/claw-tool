/**
 * installer 模块单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock 依赖模块
vi.mock('events', () => {
  const EventEmitter = vi.fn()
  EventEmitter.prototype.emit = vi.fn()
  EventEmitter.prototype.on = vi.fn()
  EventEmitter.prototype.setMaxListeners = vi.fn()
  return { EventEmitter }
})

// 动态导入被测模块（CommonJS）
const {
  compareVersions,
  checkNode,
  checkNpm,
  checkOpenClaw,
  checkEnvironment,
} = await import('../../src/main/installer.js')

// 创建 mock executor
function createMockExecutor(responses = {}) {
  return {
    exec: vi.fn(async (cmd) => {
      if (responses[cmd]) return responses[cmd]
      return { exitCode: 0, stdout: '', stderr: '' }
    }),
  }
}

describe('compareVersions', () => {
  it('相同版本应返回 true', () => {
    expect(compareVersions('22.12.0', '22.12.0')).toBe(true)
  })

  it('高版本应返回 true', () => {
    expect(compareVersions('23.0.0', '22.12.0')).toBe(true)
  })

  it('低版本应返回 false', () => {
    expect(compareVersions('20.0.0', '22.12.0')).toBe(false)
  })

  it('次版本号更高时应返回 true', () => {
    expect(compareVersions('22.13.0', '22.12.0')).toBe(true)
  })

  it('补丁版本号更高时应返回 true', () => {
    expect(compareVersions('22.12.1', '22.12.0')).toBe(true)
  })
})

describe('checkNode', () => {
  it('检测到满足要求的 Node.js 版本', async () => {
    const executor = createMockExecutor({
      'node --version': { exitCode: 0, stdout: 'v22.12.0\n', stderr: '' },
    })
    const result = await checkNode(executor)
    expect(result.installed).toBe(true)
    expect(result.version).toBe('22.12.0')
    expect(result.meetsRequirement).toBe(true)
  })

  it('未安装 Node.js 时应返回 installed: false', async () => {
    const executor = createMockExecutor({
      'node --version': { exitCode: 1, stdout: '', stderr: 'command not found' },
    })
    const result = await checkNode(executor)
    expect(result.installed).toBe(false)
    expect(result.version).toBeNull()
  })

  it('版本不满足要求时 meetsRequirement 为 false', async () => {
    const executor = createMockExecutor({
      'node --version': { exitCode: 0, stdout: 'v18.0.0\n', stderr: '' },
    })
    const result = await checkNode(executor)
    expect(result.installed).toBe(true)
    expect(result.meetsRequirement).toBe(false)
  })
})

describe('checkNpm', () => {
  it('检测到 npm', async () => {
    const executor = createMockExecutor({
      'npm --version': { exitCode: 0, stdout: '10.2.0\n', stderr: '' },
    })
    const result = await checkNpm(executor)
    expect(result.installed).toBe(true)
    expect(result.version).toBe('10.2.0')
  })

  it('未安装 npm', async () => {
    const executor = createMockExecutor({
      'npm --version': { exitCode: 1, stdout: '', stderr: '' },
    })
    const result = await checkNpm(executor)
    expect(result.installed).toBe(false)
  })
})

describe('checkOpenClaw', () => {
  it('检测到 OpenClaw', async () => {
    const executor = createMockExecutor({
      'openclaw --version': { exitCode: 0, stdout: 'openclaw 1.0.0\n', stderr: '' },
    })
    const result = await checkOpenClaw(executor)
    expect(result.installed).toBe(true)
    expect(result.version).toBe('openclaw 1.0.0')
  })

  it('未安装 OpenClaw', async () => {
    const executor = createMockExecutor({
      'openclaw --version': { exitCode: 1, stdout: '', stderr: '' },
    })
    const result = await checkOpenClaw(executor)
    expect(result.installed).toBe(false)
  })
})

describe('checkEnvironment', () => {
  it('返回完整的环境检测结果', async () => {
    const executor = createMockExecutor({
      'node --version': { exitCode: 0, stdout: 'v22.12.0\n', stderr: '' },
      'npm --version': { exitCode: 0, stdout: '10.2.0\n', stderr: '' },
      'openclaw --version': { exitCode: 0, stdout: 'openclaw 1.0.0\n', stderr: '' },
    })
    const result = await checkEnvironment(executor)
    expect(result).toHaveProperty('node')
    expect(result).toHaveProperty('npm')
    expect(result).toHaveProperty('openclaw')
    expect(result.node.installed).toBe(true)
    expect(result.npm.installed).toBe(true)
    expect(result.openclaw.installed).toBe(true)
  })
})
