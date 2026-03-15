/**
 * 通道连通性测试
 * 根据通道类型调用对应的验证接口，通过 executor 抽象层支持远程实例
 */

/**
 * 测试 Telegram Bot Token
 * 调用 https://api.telegram.org/bot<token>/getMe
 * @param {object} executor - 执行器
 * @param {object} config - 通道配置 { botToken }
 */
async function testTelegram(executor, config) {
  if (!config.botToken) return { success: false, message: { key: 'channelTest.noBotToken' } }
  const cmd = `curl -s "https://api.telegram.org/bot${config.botToken}/getMe"`
  const result = await executor.exec(cmd, { timeout: 15000 })
  if (result.exitCode !== 0) {
    return {
      success: false,
      message: { key: 'channelTest.requestFailed', params: { error: result.stderr } },
    }
  }
  try {
    const data = JSON.parse(result.stdout)
    if (data.ok) {
      return {
        success: true,
        message: {
          key: 'channelTest.botVerified',
          params: { username: data.result.username, name: data.result.first_name },
        },
        info: data.result,
      }
    }
    return {
      success: false,
      message: { key: 'channelTest.telegramApiError', params: { desc: data.description } },
    }
  } catch {
    return { success: false, message: { key: 'channelTest.parseFailed' } }
  }
}

/**
 * 测试 Discord Bot Token
 * 调用 https://discord.com/api/v10/users/@me
 * @param {object} executor - 执行器
 * @param {object} config - 通道配置 { botToken }
 */
async function testDiscord(executor, config) {
  if (!config.botToken) return { success: false, message: { key: 'channelTest.noBotToken' } }
  const cmd = `curl -s -H "Authorization: Bot ${config.botToken}" "https://discord.com/api/v10/users/@me"`
  const result = await executor.exec(cmd, { timeout: 15000 })
  if (result.exitCode !== 0) {
    return {
      success: false,
      message: { key: 'channelTest.requestFailed', params: { error: result.stderr } },
    }
  }
  try {
    const data = JSON.parse(result.stdout)
    if (data.id) {
      return {
        success: true,
        message: {
          key: 'channelTest.discordBotVerified',
          params: { username: data.username, discriminator: data.discriminator, id: data.id },
        },
        info: data,
      }
    }
    return {
      success: false,
      message: {
        key: 'channelTest.discordApiError',
        params: { message: data.message || JSON.stringify(data) },
      },
    }
  } catch {
    return { success: false, message: { key: 'channelTest.parseFailed' } }
  }
}

/**
 * 测试 Slack Bot Token
 * 调用 https://slack.com/api/auth.test
 * @param {object} executor - 执行器
 * @param {object} config - 通道配置 { botToken }
 */
async function testSlack(executor, config) {
  if (!config.botToken) return { success: false, message: { key: 'channelTest.noBotToken' } }
  const cmd = `curl -s -H "Authorization: Bearer ${config.botToken}" "https://slack.com/api/auth.test"`
  const result = await executor.exec(cmd, { timeout: 15000 })
  if (result.exitCode !== 0) {
    return {
      success: false,
      message: { key: 'channelTest.requestFailed', params: { error: result.stderr } },
    }
  }
  try {
    const data = JSON.parse(result.stdout)
    if (data.ok) {
      return {
        success: true,
        message: {
          key: 'channelTest.slackBotVerified',
          params: { user: data.user, team: data.team },
        },
        info: data,
      }
    }
    return {
      success: false,
      message: { key: 'channelTest.slackApiError', params: { error: data.error } },
    }
  } catch {
    return { success: false, message: { key: 'channelTest.parseFailed' } }
  }
}

/**
 * 测试 Matrix 连接
 * 调用 homeserver /_matrix/client/v3/account/whoami
 * @param {object} executor - 执行器
 * @param {object} config - 通道配置 { homeserverUrl, accessToken }
 */
async function testMatrix(executor, config) {
  if (!config.homeserverUrl || !config.accessToken) {
    return { success: false, message: { key: 'channelTest.matrixNoConfig' } }
  }
  const url = `${config.homeserverUrl.replace(/\/$/, '')}/_matrix/client/v3/account/whoami`
  const cmd = `curl -s -H "Authorization: Bearer ${config.accessToken}" "${url}"`
  const result = await executor.exec(cmd, { timeout: 15000 })
  if (result.exitCode !== 0) {
    return {
      success: false,
      message: { key: 'channelTest.requestFailed', params: { error: result.stderr } },
    }
  }
  try {
    const data = JSON.parse(result.stdout)
    if (data.user_id) {
      return {
        success: true,
        message: { key: 'channelTest.matrixVerified', params: { userId: data.user_id } },
        info: data,
      }
    }
    return {
      success: false,
      message: {
        key: 'channelTest.matrixApiError',
        params: { error: data.error || JSON.stringify(data) },
      },
    }
  } catch {
    return { success: false, message: { key: 'channelTest.parseFailed' } }
  }
}

/**
 * 测试 Mattermost Bot Token
 * 调用 /api/v4/users/me
 * @param {object} executor - 执行器
 * @param {object} config - 通道配置 { serverUrl, botToken }
 */
async function testMattermost(executor, config) {
  if (!config.serverUrl || !config.botToken) {
    return { success: false, message: { key: 'channelTest.mattermostNoConfig' } }
  }
  const url = `${config.serverUrl.replace(/\/$/, '')}/api/v4/users/me`
  const cmd = `curl -s -H "Authorization: Bearer ${config.botToken}" "${url}"`
  const result = await executor.exec(cmd, { timeout: 15000 })
  if (result.exitCode !== 0) {
    return {
      success: false,
      message: { key: 'channelTest.requestFailed', params: { error: result.stderr } },
    }
  }
  try {
    const data = JSON.parse(result.stdout)
    if (data.id) {
      return {
        success: true,
        message: {
          key: 'channelTest.mattermostVerified',
          params: { username: data.username, id: data.id },
        },
        info: data,
      }
    }
    return {
      success: false,
      message: {
        key: 'channelTest.mattermostApiError',
        params: { message: data.message || JSON.stringify(data) },
      },
    }
  } catch {
    return { success: false, message: { key: 'channelTest.parseFailed' } }
  }
}

/**
 * 测试 LINE Channel
 * 调用 https://api.line.me/v2/bot/info
 * @param {object} executor - 执行器
 * @param {object} config - 通道配置 { channelAccessToken }
 */
async function testLine(executor, config) {
  if (!config.channelAccessToken)
    return { success: false, message: { key: 'channelTest.lineNoToken' } }
  const cmd = `curl -s -H "Authorization: Bearer ${config.channelAccessToken}" "https://api.line.me/v2/bot/info"`
  const result = await executor.exec(cmd, { timeout: 15000 })
  if (result.exitCode !== 0) {
    return {
      success: false,
      message: { key: 'channelTest.requestFailed', params: { error: result.stderr } },
    }
  }
  try {
    const data = JSON.parse(result.stdout)
    if (data.userId) {
      return {
        success: true,
        message: {
          key: 'channelTest.lineBotVerified',
          params: { name: data.displayName, basicId: data.basicId },
        },
        info: data,
      }
    }
    return {
      success: false,
      message: {
        key: 'channelTest.lineApiError',
        params: { message: data.message || JSON.stringify(data) },
      },
    }
  } catch {
    return { success: false, message: { key: 'channelTest.parseFailed' } }
  }
}

/**
 * 测试飞书 App
 * 获取 tenant_access_token
 * @param {object} executor - 执行器
 * @param {object} config - 通道配置 { appId, appSecret }
 */
async function testFeishu(executor, config) {
  if (!config.appId || !config.appSecret) {
    return { success: false, message: { key: 'channelTest.feishuNoConfig' } }
  }
  const body = JSON.stringify({ app_id: config.appId, app_secret: config.appSecret })
  const cmd = `curl -s -X POST "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal" -H "Content-Type: application/json" -d ${JSON.stringify(body)}`
  const result = await executor.exec(cmd, { timeout: 15000 })
  if (result.exitCode !== 0) {
    return {
      success: false,
      message: { key: 'channelTest.requestFailed', params: { error: result.stderr } },
    }
  }
  try {
    const data = JSON.parse(result.stdout)
    if (data.code === 0 && data.tenant_access_token) {
      return {
        success: true,
        message: { key: 'channelTest.feishuVerified', params: { expire: data.expire } },
        info: { expire: data.expire },
      }
    }
    return {
      success: false,
      message: {
        key: 'channelTest.feishuApiError',
        params: { msg: data.msg || JSON.stringify(data) },
      },
    }
  } catch {
    return { success: false, message: { key: 'channelTest.parseFailed' } }
  }
}

/**
 * 通用通道测试（不支持直接 API 测试的通道）
 * 通过 openclaw 命令检测通道配置
 */
async function testGeneric(executor, channelId) {
  const result = await executor.exec(`openclaw status`, { timeout: 10000 })
  if (result.exitCode === 0 && result.stdout.includes(channelId)) {
    return {
      success: true,
      message: { key: 'channelTest.genericVisible', params: { channelId } },
    }
  }
  return {
    success: null,
    message: { key: 'channelTest.genericUnsupported' },
  }
}

/**
 * 测试指定通道
 * @param {object} executor - 执行器
 * @param {string} channelId - 通道 ID (telegram, discord, ...)
 * @param {object} config - 通道配置（从 openclaw.json 中读取或从表单中获取）
 * @returns {Promise<{success: boolean|null, message: {key: string, params?: object}, info?: object}>}
 */
async function testChannel(executor, channelId, config) {
  try {
    switch (channelId) {
      case 'telegram':
        return await testTelegram(executor, config)
      case 'discord':
        return await testDiscord(executor, config)
      case 'slack':
        return await testSlack(executor, config)
      case 'matrix':
        return await testMatrix(executor, config)
      case 'mattermost':
        return await testMattermost(executor, config)
      case 'line':
        return await testLine(executor, config)
      case 'feishu':
        return await testFeishu(executor, config)
      default:
        return await testGeneric(executor, channelId)
    }
  } catch (err) {
    return {
      success: false,
      message: { key: 'channelTest.requestFailed', params: { error: err.message } },
    }
  }
}

module.exports = { testChannel }
