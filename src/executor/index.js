/**
 * 执行器模块入口
 */

const { LocalExecutor } = require('./local-executor')
const { SshExecutor } = require('./ssh-executor')
const {
  getExecutor,
  removeExecutor,
  disposeAll,
  startHealthCheck,
  stopHealthCheck,
  localExecutor,
} = require('./executor-factory')

module.exports = {
  LocalExecutor,
  SshExecutor,
  getExecutor,
  removeExecutor,
  disposeAll,
  startHealthCheck,
  stopHealthCheck,
  localExecutor,
}
