/**
 * NW.js 预加载脚本
 * 在渲染进程中注入 Node.js 能力
 */

// NW.js 的 mixed-context 模式下，渲染进程可直接访问 Node.js API
// 此文件用于提前加载和缓存常用模块

const fs = require('fs')
const path = require('path')
const { exec, spawn } = require('child_process')
const os = require('os')

// 挂载到全局供渲染进程使用
if (typeof window !== 'undefined') {
  window.__node = {
    fs,
    path,
    exec,
    spawn,
    os,
    require,
  }
}
