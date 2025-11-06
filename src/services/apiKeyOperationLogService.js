const { v4: uuidv4 } = require('uuid')
const redis = require('../models/redis')
const logger = require('../utils/logger')

/**
 * API Key 操作日志服务
 * 专门记录管理员对 API Key 的增删改操作
 */
class ApiKeyOperationLogService {
  constructor() {
    this.logPrefix = 'apikey_op_log:'
    this.globalIndexKey = 'apikey_op_logs_global'
    this.byKeyIndexPrefix = 'apikey_op_logs_by_key:'
    this.byOperatorIndexPrefix = 'apikey_op_logs_by_operator:'
  }

  /**
   * 记录创建 API Key 操作
   * @param {Object} params
   * @param {string} params.operator - 操作者用户名
   * @param {string} params.operatorType - 操作者类型 ('admin' 或 'user')
   * @param {Object} params.keyData - 创建的 Key 完整数据
   * @param {string} params.clientIp - 客户端IP
   */
  async recordCreate({ operator, operatorType, keyData, clientIp }) {
    try {
      const logEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        action: 'create',
        operator,
        operatorType,
        keyId: keyData.id,
        keyName: keyData.name,
        clientIp: clientIp || 'unknown',

        // 记录创建时的完整初始化信息
        initialData: this._extractKeyFields(keyData)
      }

      await this._saveLog(logEntry)

      logger.audit('📝 API Key created', {
        operator,
        keyId: keyData.id,
        keyName: keyData.name
      })

      return logEntry
    } catch (error) {
      logger.error('❌ Failed to record API Key creation log:', error)
      // 不抛出错误，避免影响主流程
      return null
    }
  }

  /**
   * 记录更新 API Key 操作
   * @param {Object} params
   * @param {string} params.operator - 操作者用户名
   * @param {string} params.operatorType - 操作者类型
   * @param {string} params.keyId - Key ID
   * @param {string} params.keyName - Key 名称
   * @param {Object} params.beforeData - 修改前的数据
   * @param {Object} params.afterData - 修改后的数据
   * @param {string} params.clientIp - 客户端IP
   */
  async recordUpdate({ operator, operatorType, keyId, keyName, beforeData, afterData, clientIp }) {
    try {
      // 对比找出实际变更的字段
      const changes = this._detectChanges(beforeData, afterData)

      // 如果没有实际变更，不记录日志
      if (Object.keys(changes).length === 0) {
        logger.debug('No actual changes detected, skipping log')
        return null
      }

      const logEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        action: 'update',
        operator,
        operatorType,
        keyId,
        keyName,
        clientIp: clientIp || 'unknown',

        // 只记录变更的字段
        changes
      }

      await this._saveLog(logEntry)

      logger.audit('📝 API Key updated', {
        operator,
        keyId,
        keyName,
        changedFields: Object.keys(changes)
      })

      return logEntry
    } catch (error) {
      logger.error('❌ Failed to record API Key update log:', error)
      return null
    }
  }

  /**
   * 记录删除 API Key 操作
   * @param {Object} params
   * @param {string} params.operator - 操作者用户名
   * @param {string} params.operatorType - 操作者类型
   * @param {string} params.keyId - Key ID
   * @param {string} params.keyName - Key 名称
   * @param {string} params.clientIp - 客户端IP
   */
  async recordDelete({ operator, operatorType, keyId, keyName, clientIp }) {
    try {
      const logEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        action: 'delete',
        operator,
        operatorType,
        keyId,
        keyName,
        clientIp: clientIp || 'unknown'
      }

      await this._saveLog(logEntry)

      logger.audit('📝 API Key deleted', {
        operator,
        keyId,
        keyName
      })

      return logEntry
    } catch (error) {
      logger.error('❌ Failed to record API Key deletion log:', error)
      return null
    }
  }

  /**
   * 记录恢复 API Key 操作
   * @param {Object} params
   */
  async recordRestore({ operator, operatorType, keyId, keyName, clientIp }) {
    try {
      const logEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        action: 'restore',
        operator,
        operatorType,
        keyId,
        keyName,
        clientIp: clientIp || 'unknown'
      }

      await this._saveLog(logEntry)

      logger.audit('📝 API Key restored', {
        operator,
        keyId,
        keyName
      })

      return logEntry
    } catch (error) {
      logger.error('❌ Failed to record API Key restore log:', error)
      return null
    }
  }

  /**
   * 获取操作日志列表
   * @param {Object} options - 查询选项
   * @param {number} options.page - 页码（从1开始）
   * @param {number} options.limit - 每页数量
   * @param {string} options.keyId - 按Key ID筛选
   * @param {string} options.operator - 按操作者筛选
   * @param {string} options.action - 按操作类型筛选 (create/update/delete/restore)
   * @param {string} options.startDate - 起始时间
   * @param {string} options.endDate - 结束时间
   * @returns {Object} { logs, total, page, limit }
   */
  async getLogs(options = {}) {
    const { page = 1, limit = 50, keyId, operator, action, startDate, endDate } = options

    const client = redis.getClient()
    if (!client) {
      throw new Error('Redis client is not available')
    }

    try {
      // 确定使用哪个索引
      let indexKey = this.globalIndexKey
      if (keyId) {
        indexKey = `${this.byKeyIndexPrefix}${keyId}`
      } else if (operator) {
        indexKey = `${this.byOperatorIndexPrefix}${operator}`
      }

      // 计算时间范围
      const minScore = startDate ? new Date(startDate).getTime() : '-inf'
      const maxScore = endDate ? new Date(endDate).getTime() : '+inf'

      // 获取总数
      const total = await client.zcount(indexKey, minScore, maxScore)

      if (total === 0) {
        return {
          logs: [],
          total: 0,
          page,
          limit
        }
      }

      // 计算分页
      const offset = (page - 1) * limit

      // 获取日志ID（倒序：最新的在前）
      const logIds = await client.zrevrangebyscore(
        indexKey,
        maxScore,
        minScore,
        'LIMIT',
        offset,
        limit
      )

      // 批量获取日志详情
      let logs = await this._fetchLogs(logIds)

      // 如果有action筛选，进行过滤
      if (action) {
        logs = logs.filter((log) => log.action === action)
      }

      return {
        logs,
        total,
        page,
        limit
      }
    } catch (error) {
      logger.error('❌ Failed to get operation logs:', error)
      throw error
    }
  }

  /**
   * 获取单条日志
   * @param {string} logId
   */
  async getLog(logId) {
    const client = redis.getClient()
    if (!client) {
      throw new Error('Redis client is not available')
    }

    const logData = await client.hgetall(`${this.logPrefix}${logId}`)
    if (!logData || Object.keys(logData).length === 0) {
      return null
    }

    return this._parseLogData(logData)
  }

  /**
   * 清理过期日志
   * @param {number} retentionDays - 保留天数（默认90天）
   * @returns {number} 清理的日志数量
   */
  async cleanupExpiredLogs(retentionDays = 90) {
    const client = redis.getClient()
    if (!client) {
      throw new Error('Redis client is not available')
    }

    if (retentionDays <= 0) {
      logger.debug('Operation log cleanup disabled (retention = 0)')
      return 0
    }

    const expireTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000

    // 从全局索引中获取过期的日志ID
    const expiredIds = await client.zrangebyscore(this.globalIndexKey, '-inf', expireTime)

    if (expiredIds.length === 0) {
      logger.debug('No expired operation logs to clean up')
      return 0
    }

    // 批量删除
    for (const logId of expiredIds) {
      const logData = await client.hgetall(`${this.logPrefix}${logId}`)
      if (logData) {
        // 从各个索引中删除
        await client.zrem(this.globalIndexKey, logId)
        await client.zrem(`${this.byKeyIndexPrefix}${logData.keyId}`, logId)
        await client.zrem(`${this.byOperatorIndexPrefix}${logData.operator}`, logId)

        // 删除日志数据
        await client.del(`${this.logPrefix}${logId}`)
      }
    }

    logger.info(`🧹 Cleaned up ${expiredIds.length} expired operation logs`)
    return expiredIds.length
  }

  /**
   * 提取 Key 的关键字段（用于记录）
   * @private
   */
  _extractKeyFields(keyData) {
    return {
      name: keyData.name,
      description: keyData.description || '',
      permissions: keyData.permissions || 'all',
      isActive: keyData.isActive,

      // 账号绑定
      claudeAccountId: keyData.claudeAccountId || null,
      claudeConsoleAccountId: keyData.claudeConsoleAccountId || null,
      geminiAccountId: keyData.geminiAccountId || null,
      openaiAccountId: keyData.openaiAccountId || null,
      azureOpenaiAccountId: keyData.azureOpenaiAccountId || null,
      bedrockAccountId: keyData.bedrockAccountId || null,
      droidAccountId: keyData.droidAccountId || null,

      // 使用限制
      concurrencyLimit: parseInt(keyData.concurrencyLimit) || 0,
      rateLimitWindow: parseInt(keyData.rateLimitWindow) || 0,
      rateLimitRequests: parseInt(keyData.rateLimitRequests) || 0,
      rateLimitCost: parseFloat(keyData.rateLimitCost) || 0,
      dailyCostLimit: parseFloat(keyData.dailyCostLimit) || 0,
      totalCostLimit: parseFloat(keyData.totalCostLimit) || 0,
      weeklyOpusCostLimit: parseFloat(keyData.weeklyOpusCostLimit) || 0,

      // 模型和客户端限制
      enableModelRestriction:
        keyData.enableModelRestriction === 'true' || keyData.enableModelRestriction === true,
      restrictedModels: Array.isArray(keyData.restrictedModels)
        ? keyData.restrictedModels
        : this._safeJSONParse(keyData.restrictedModels, []),
      enableClientRestriction:
        keyData.enableClientRestriction === 'true' || keyData.enableClientRestriction === true,
      allowedClients: Array.isArray(keyData.allowedClients)
        ? keyData.allowedClients
        : this._safeJSONParse(keyData.allowedClients, []),

      // 过期设置
      expiresAt: keyData.expiresAt || null,
      expirationMode: keyData.expirationMode || 'fixed',
      activationDays: parseInt(keyData.activationDays) || 0,
      activationUnit: keyData.activationUnit || 'days',

      // 标签
      tags: Array.isArray(keyData.tags) ? keyData.tags : this._safeJSONParse(keyData.tags, []),

      // 所有者信息
      createdBy: keyData.createdBy || 'admin',
      userId: keyData.userId || '',
      userUsername: keyData.userUsername || ''
    }
  }

  /**
   * 对比两个数据对象，找出变更的字段
   * @private
   */
  _detectChanges(beforeData, afterData) {
    const changes = {}

    // 定义需要对比的字段及其显示名称
    const fieldsToCompare = {
      name: 'Key名称',
      description: '描述',
      permissions: '服务权限',
      isActive: '激活状态',
      claudeAccountId: 'Claude账号',
      claudeConsoleAccountId: 'Claude Console账号',
      geminiAccountId: 'Gemini账号',
      openaiAccountId: 'OpenAI账号',
      azureOpenaiAccountId: 'Azure OpenAI账号',
      bedrockAccountId: 'Bedrock账号',
      droidAccountId: 'Droid账号',
      concurrencyLimit: '并发限制',
      rateLimitWindow: '速率限制窗口(分钟)',
      rateLimitRequests: '速率限制请求数',
      rateLimitCost: '速率限制成本',
      dailyCostLimit: '每日成本限制',
      totalCostLimit: '总成本限制',
      weeklyOpusCostLimit: '周Opus成本限制',
      enableModelRestriction: '启用模型限制',
      restrictedModels: '限制的模型列表',
      enableClientRestriction: '启用客户端限制',
      allowedClients: '允许的客户端列表',
      expiresAt: '过期时间',
      expirationMode: '过期模式',
      activationDays: '激活有效期',
      activationUnit: '激活时间单位',
      tags: '标签',
      createdBy: '所有者',
      userId: '用户ID',
      userUsername: '用户名'
    }

    for (const [field, displayName] of Object.entries(fieldsToCompare)) {
      const beforeValue = beforeData[field]
      const afterValue = afterData[field]

      // 对比值是否变化
      if (!this._isEqual(beforeValue, afterValue)) {
        changes[field] = {
          displayName,
          before: this._formatValue(field, beforeValue),
          after: this._formatValue(field, afterValue)
        }
      }
    }

    return changes
  }

  /**
   * 判断两个值是否相等（支持数组和对象）
   * @private
   */
  _isEqual(a, b) {
    // 处理 null/undefined
    if (a === null && b === null) {
      return true
    }
    if (a === null || b === null) {
      return false
    }

    // 处理数组
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        return false
      }
      return a.every((item, index) => this._isEqual(item, b[index]))
    }

    // 处理对象
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a)
      const keysB = Object.keys(b)
      if (keysA.length !== keysB.length) {
        return false
      }
      return keysA.every((key) => this._isEqual(a[key], b[key]))
    }

    // 基本类型对比
    return a === b
  }

  /**
   * 格式化字段值用于显示
   * @private
   */
  _formatValue(field, value) {
    if (value === null || value === undefined || value === '') {
      // 根据字段类型返回友好的"未设置"显示
      if (field.includes('Limit') || field.includes('Window') || field.includes('Days')) {
        return '不限制'
      }
      if (field.includes('AccountId')) {
        return '未绑定'
      }
      if (field.includes('Models') || field.includes('Clients') || field === 'tags') {
        return '[]'
      }
      return '未设置'
    }

    // 布尔值转换
    if (typeof value === 'boolean') {
      return value ? '是' : '否'
    }

    // 数字类型的限制字段（0表示不限制）
    if (
      (field.includes('Limit') || field.includes('Window') || field.includes('Days')) &&
      typeof value === 'number'
    ) {
      return value === 0 ? '不限制' : value.toString()
    }

    // 数组类型
    if (Array.isArray(value)) {
      return value.length === 0 ? '[]' : JSON.stringify(value)
    }

    // 对象类型
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }

    // 字符串类型
    return value.toString()
  }

  /**
   * 保存日志到Redis
   * @private
   */
  async _saveLog(logEntry) {
    const client = redis.getClient()
    if (!client) {
      throw new Error('Redis client is not available')
    }

    const timestamp = new Date(logEntry.timestamp).getTime()

    // 序列化复杂字段
    const storageData = {
      ...logEntry,
      initialData: logEntry.initialData ? JSON.stringify(logEntry.initialData) : '',
      changes: logEntry.changes ? JSON.stringify(logEntry.changes) : ''
    }

    // 存储日志数据
    await client.hset(`${this.logPrefix}${logEntry.id}`, storageData)

    // 添加到全局索引
    await client.zadd(this.globalIndexKey, timestamp, logEntry.id)

    // 添加到按Key的索引
    if (logEntry.keyId) {
      await client.zadd(`${this.byKeyIndexPrefix}${logEntry.keyId}`, timestamp, logEntry.id)
    }

    // 添加到按操作者的索引
    if (logEntry.operator) {
      await client.zadd(`${this.byOperatorIndexPrefix}${logEntry.operator}`, timestamp, logEntry.id)
    }
  }

  /**
   * 批量获取日志详情
   * @private
   */
  async _fetchLogs(logIds) {
    if (!logIds || logIds.length === 0) {
      return []
    }

    const client = redis.getClient()
    const logs = []

    for (const logId of logIds) {
      const logData = await client.hgetall(`${this.logPrefix}${logId}`)
      if (logData && Object.keys(logData).length > 0) {
        logs.push(this._parseLogData(logData))
      }
    }

    return logs
  }

  /**
   * 解析Redis存储的日志数据
   * @private
   */
  _parseLogData(logData) {
    return {
      ...logData,
      initialData: this._safeJSONParse(logData.initialData, null),
      changes: this._safeJSONParse(logData.changes, {})
    }
  }

  /**
   * 安全的JSON解析
   * @private
   */
  _safeJSONParse(jsonStr, fallback) {
    try {
      return jsonStr ? JSON.parse(jsonStr) : fallback
    } catch (error) {
      return fallback
    }
  }
}

module.exports = new ApiKeyOperationLogService()
