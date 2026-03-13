/**
 * 通道测试记录管理
 * 保存和读取通道测试结果，持久化到 ~/.claw-tool/channel-tests.json
 * 结构：{ [channelId]: { success, message, timestamp } }
 */

const fs = require('fs').promises
const path = require('path')
const os = require('os')

const CLAW_TOOL_DIR = path.join(os.homedir(), '.claw-tool')
const RECORDS_FILE = path.join(CLAW_TOOL_DIR, 'channel-tests.json')

let records = {}

async function loadRecords() {
  try {
    const data = await fs.readFile(RECORDS_FILE, 'utf-8')
    records = JSON.parse(data)
  } catch {
    records = {}
  }
  return records
}

async function saveRecord(channelId, result) {
  records[channelId] = {
    success: result.success,
    message: result.message,
    timestamp: Date.now(),
  }
  try {
    await fs.mkdir(CLAW_TOOL_DIR, { recursive: true })
    await fs.writeFile(RECORDS_FILE, JSON.stringify(records, null, 2), 'utf-8')
  } catch (err) {
    console.warn('[channel-test-records] 保存失败:', err.message)
  }
}

function getRecord(channelId) {
  return records[channelId] || null
}

function getAllRecords() {
  return { ...records }
}

module.exports = { loadRecords, saveRecord, getRecord, getAllRecords }
