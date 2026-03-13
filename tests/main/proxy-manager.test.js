/**
 * proxy-manager 模块单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fs.promises
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(async () => {}),
    readFile: vi.fn(async () => {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    }),
    writeFile: vi.fn(async () => {}),
  },
}))

const {
  buildProxyUrl,
  getProxyEnv,
  getNpmProxyArgs,
  DEFAULT_PROXY_CONFIG,
} = await import('../../src/main/proxy-manager.js')

describe('buildProxyUrl', () => {
  it('type 为 none 时返回 null', () => {
    expect(buildProxyUrl({ type: 'none', host: '', port: '' })).toBeNull()
  })

  it('构建 HTTP 代理 URL', () => {
    const url = buildProxyUrl({ type: 'http', host: '127.0.0.1', port: '8080' })
    expect(url).toBe('http://127.0.0.1:8080')
  })

  it('构建带认证的代理 URL', () => {
    const url = buildProxyUrl({
      type: 'http',
      host: '127.0.0.1',
      port: '8080',
      username: 'user',
      password: 'pass',
    })
    expect(url).toBe('http://user:pass@127.0.0.1:8080')
  })

  it('构建 SOCKS5 代理 URL', () => {
    const url = buildProxyUrl({ type: 'socks5', host: '127.0.0.1', port: '1080' })
    expect(url).toBe('socks5://127.0.0.1:1080')
  })

  it('host 或 port 为空时返回 null', () => {
    expect(buildProxyUrl({ type: 'http', host: '', port: '8080' })).toBeNull()
    expect(buildProxyUrl({ type: 'http', host: '127.0.0.1', port: '' })).toBeNull()
  })

  it('用户名含特殊字符时应 URL 编码', () => {
    const url = buildProxyUrl({
      type: 'http',
      host: 'proxy.example.com',
      port: '3128',
      username: 'user@domain',
      password: 'p@ss:word',
    })
    expect(url).toContain('user%40domain')
    expect(url).toContain('p%40ss%3Aword')
  })
})

describe('getProxyEnv', () => {
  it('无代理时返回空对象', () => {
    const env = getProxyEnv({ type: 'none', host: '', port: '' })
    expect(Object.keys(env)).toHaveLength(0)
  })

  it('HTTP 代理应设置 HTTP_PROXY 和 HTTPS_PROXY', () => {
    const env = getProxyEnv({ type: 'http', host: '127.0.0.1', port: '8080', noProxy: '' })
    expect(env.HTTP_PROXY).toBe('http://127.0.0.1:8080')
    expect(env.HTTPS_PROXY).toBe('http://127.0.0.1:8080')
    expect(env.http_proxy).toBe('http://127.0.0.1:8080')
    expect(env.https_proxy).toBe('http://127.0.0.1:8080')
  })

  it('SOCKS5 代理应同时设置 ALL_PROXY', () => {
    const env = getProxyEnv({ type: 'socks5', host: '127.0.0.1', port: '1080', noProxy: '' })
    expect(env.ALL_PROXY).toBe('socks5://127.0.0.1:1080')
    expect(env.all_proxy).toBe('socks5://127.0.0.1:1080')
  })

  it('应设置 NO_PROXY', () => {
    const env = getProxyEnv({
      type: 'http',
      host: '127.0.0.1',
      port: '8080',
      noProxy: 'localhost,127.0.0.1',
    })
    expect(env.NO_PROXY).toBe('localhost,127.0.0.1')
  })
})

describe('DEFAULT_PROXY_CONFIG', () => {
  it('默认类型为 none', () => {
    expect(DEFAULT_PROXY_CONFIG.type).toBe('none')
  })

  it('包含所有必要字段', () => {
    expect(DEFAULT_PROXY_CONFIG).toHaveProperty('type')
    expect(DEFAULT_PROXY_CONFIG).toHaveProperty('host')
    expect(DEFAULT_PROXY_CONFIG).toHaveProperty('port')
    expect(DEFAULT_PROXY_CONFIG).toHaveProperty('noProxy')
  })
})
