/**
 * IPC 事件总线单元测试
 */

import { describe, it, expect, vi } from 'vitest'

const { eventBus, Events } = await import('../../src/shared/ipc.js')

describe('eventBus', () => {
  it('应该是一个 EventEmitter 实例', () => {
    expect(eventBus).toBeDefined()
    expect(typeof eventBus.on).toBe('function')
    expect(typeof eventBus.emit).toBe('function')
  })

  it('应能发送和接收事件', () => {
    const handler = vi.fn()
    eventBus.on('test:event', handler)
    eventBus.emit('test:event', { data: 'hello' })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ data: 'hello' })

    eventBus.removeListener('test:event', handler)
  })

  it('最大监听器数应大于默认值', () => {
    expect(eventBus.getMaxListeners()).toBe(50)
  })
})

describe('Events 常量', () => {
  it('包含服务状态事件', () => {
    expect(Events.SERVICE_STATUS_CHANGED).toBe('service:status-changed')
  })

  it('包含日志事件', () => {
    expect(Events.LOG_ENTRY).toBe('log:entry')
  })

  it('包含配置变化事件', () => {
    expect(Events.CONFIG_CHANGED).toBe('config:changed')
  })

  it('包含实例事件', () => {
    expect(Events.INSTANCE_CHANGED).toBe('instance:changed')
    expect(Events.INSTANCE_CONNECTION_STATUS).toBe('instance:connection-status')
  })

  it('包含安装模块事件', () => {
    expect(Events.INSTALLER_PROGRESS).toBe('installer:progress')
    expect(Events.INSTALLER_LOG).toBe('installer:log')
    expect(Events.INSTALLER_COMPLETE).toBe('installer:complete')
    expect(Events.INSTALLER_ERROR).toBe('installer:error')
  })

  it('包含托盘事件', () => {
    expect(Events.TRAY_SHOW_WINDOW).toBe('tray:show-window')
    expect(Events.TRAY_QUIT).toBe('tray:quit')
  })
})
