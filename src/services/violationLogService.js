const { v4: uuidv4 } = require('uuid')
const redis = require('../models/redis')
const logger = require('../utils/logger')

class ViolationLogService {
  /**
   * 记录违规日志
   * @param {string} apiKeyId - API Key ID
   * @param {Object} violationData - 违规详情
   */
  async recordViolation(apiKeyId, violationData) {
    const {
      apiKeyName,
      matchedWords,
      contentSample,
      requestPath,
      clientIp,
      userAgent,
      requestId,
      details = {}
    } = violationData

    const violationId = uuidv4()
    const timestamp = Date.now()
    const now = new Date(timestamp).toISOString()

    const logData = {
      id: violationId,
      apiKeyId,
      apiKeyName: apiKeyName || 'Unknown',
      matchedWords: JSON.stringify(matchedWords || []),
      contentSample: this._sanitizeContent(contentSample, matchedWords),
      requestPath: requestPath || 'Unknown',
      clientIp: clientIp || 'Unknown',
      userAgent: userAgent || 'Unknown',
      requestId: requestId || 'Unknown',
      timestamp: now,
      details: JSON.stringify(details)
    }

    const client = redis.getClient()
    if (!client) {
      logger.error('❌ Redis client is not available, violation log not recorded')
      return null
    }

    try {
      // 存储违规日志
      await client.hset(`violation_log:${violationId}`, logData)

      // 添加到按API Key的索引（Sorted Set，按时间戳排序）
      await client.zadd(`violation_logs_by_key:${apiKeyId}`, timestamp, violationId)

      // 添加到全局索引
      await client.zadd('violation_logs_global', timestamp, violationId)

      logger.security(`🚫 Violation recorded: ${apiKeyName} matched ${matchedWords.length} word(s)`)

      return {
        ...logData,
        matchedWords: JSON.parse(logData.matchedWords),
        details: JSON.parse(logData.details)
      }
    } catch (error) {
      logger.error('❌ Failed to record violation log:', error)
      throw error
    }
  }

  /**
   * 脱敏内容片段（限制长度，智能截取匹配词附近内容）
   * @private
   * @param {string} content - 原始内容
   * @param {Array} matchedWords - 匹配的敏感词列表 [{word, category, position}]
   * @returns {string} 脱敏后的内容
   */
  _sanitizeContent(content, matchedWords = []) {
    if (!content || typeof content !== 'string') {
      return ''
    }

    const maxLength = 200

    // 如果内容本身就不超过最大长度，直接返回
    if (content.length <= maxLength) {
      return content
    }

    // 如果有匹配词位置信息，截取第一个匹配词附近的内容
    if (matchedWords && matchedWords.length > 0 && matchedWords[0].position !== undefined) {
      const firstMatchPosition = matchedWords[0].position

      // 计算截取起始位置：让匹配词出现在预览的中间位置
      const halfLength = Math.floor(maxLength / 2)
      const startPos = Math.max(0, firstMatchPosition - halfLength)

      // 如果截取位置不在开头，添加省略号前缀
      const prefix = startPos > 0 ? '...' : ''
      const availableLength = maxLength - prefix.length - 3 // 减去后缀省略号的长度

      // 截取内容
      const sample = content.substring(startPos, startPos + availableLength)

      return `${prefix + sample}...`
    }

    // 如果没有位置信息，按原来的方式截取前200个字符
    return `${content.substring(0, maxLength)}...`
  }

  /**
   * 获取指定API Key的违规日志
   * @param {string} apiKeyId - API Key ID
   * @param {Object} options - 查询选项 { page, limit, startDate, endDate }
   * @returns {Object} { logs, total, page, limit }
   */
  async getViolationsByApiKey(apiKeyId, options = {}) {
    const { page = 1, limit = 50, startDate, endDate } = options

    const client = redis.getClient()
    if (!client) {
      throw new Error('Redis client is not available')
    }

    // 计算时间范围
    const minScore = startDate ? new Date(startDate).getTime() : '-inf'
    const maxScore = endDate ? new Date(endDate).getTime() : '+inf'

    // 获取总数
    const total = await client.zcount(`violation_logs_by_key:${apiKeyId}`, minScore, maxScore)

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

    // 获取违规日志ID（倒序：最新的在前）
    const violationIds = await client.zrevrangebyscore(
      `violation_logs_by_key:${apiKeyId}`,
      maxScore,
      minScore,
      'LIMIT',
      offset,
      limit
    )

    // 批量获取日志详情
    const logs = await this._fetchLogs(violationIds)

    return {
      logs,
      total,
      page,
      limit
    }
  }

  /**
   * 获取所有违规日志
   * @param {Object} options - 查询选项 { page, limit, startDate, endDate, apiKeyId }
   * @returns {Object} { logs, total, page, limit }
   */
  async getAllViolations(options = {}) {
    const { page = 1, limit = 50, startDate, endDate, apiKeyId } = options

    // 如果指定了apiKeyId，调用getViolationsByApiKey
    if (apiKeyId) {
      return this.getViolationsByApiKey(apiKeyId, options)
    }

    const client = redis.getClient()
    if (!client) {
      throw new Error('Redis client is not available')
    }

    // 计算时间范围
    const minScore = startDate ? new Date(startDate).getTime() : '-inf'
    const maxScore = endDate ? new Date(endDate).getTime() : '+inf'

    // 获取总数
    const total = await client.zcount('violation_logs_global', minScore, maxScore)

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

    // 获取违规日志ID（倒序：最新的在前）
    const violationIds = await client.zrevrangebyscore(
      'violation_logs_global',
      maxScore,
      minScore,
      'LIMIT',
      offset,
      limit
    )

    // 批量获取日志详情
    const logs = await this._fetchLogs(violationIds)

    return {
      logs,
      total,
      page,
      limit
    }
  }

  /**
   * 批量获取日志详情
   * @private
   * @param {Array<string>} violationIds - 违规日志ID数组
   * @returns {Array} 日志数组
   */
  async _fetchLogs(violationIds) {
    if (!violationIds || violationIds.length === 0) {
      return []
    }

    const client = redis.getClient()
    const logs = []

    for (const violationId of violationIds) {
      const logData = await client.hgetall(`violation_log:${violationId}`)
      if (logData && Object.keys(logData).length > 0) {
        logs.push({
          ...logData,
          matchedWords: this._safeJSONParse(logData.matchedWords, []),
          details: this._safeJSONParse(logData.details, {})
        })
      }
    }

    return logs
  }

  /**
   * 安全的JSON解析
   * @private
   * @param {string} jsonStr - JSON字符串
   * @param {*} fallback - 解析失败时的默认值
   * @returns {*} 解析结果或默认值
   */
  _safeJSONParse(jsonStr, fallback) {
    try {
      return JSON.parse(jsonStr)
    } catch (error) {
      return fallback
    }
  }

  /**
   * 获取单条违规日志
   * @param {string} violationId - 违规日志ID
   * @returns {Object|null} 日志数据
   */
  async getViolation(violationId) {
    const client = redis.getClient()
    if (!client) {
      throw new Error('Redis client is not available')
    }

    const logData = await client.hgetall(`violation_log:${violationId}`)
    if (!logData || Object.keys(logData).length === 0) {
      return null
    }

    return {
      ...logData,
      matchedWords: this._safeJSONParse(logData.matchedWords, []),
      details: this._safeJSONParse(logData.details, {})
    }
  }

  /**
   * 删除单条违规日志
   * @param {string} violationId - 违规日志ID
   */
  async deleteViolation(violationId) {
    const client = redis.getClient()
    if (!client) {
      throw new Error('Redis client is not available')
    }

    // 先获取日志数据以获取apiKeyId
    const logData = await client.hgetall(`violation_log:${violationId}`)
    if (logData && logData.apiKeyId) {
      // 从按Key的索引中删除
      await client.zrem(`violation_logs_by_key:${logData.apiKeyId}`, violationId)
    }

    // 从全局索引中删除
    await client.zrem('violation_logs_global', violationId)

    // 删除日志数据
    await client.del(`violation_log:${violationId}`)

    logger.info(`✅ Deleted violation log: ${violationId}`)
  }

  /**
   * 批量删除违规日志
   * @param {Array<string>} violationIds - 违规日志ID数组
   */
  async batchDeleteViolations(violationIds) {
    if (!Array.isArray(violationIds) || violationIds.length === 0) {
      throw new Error('违规日志ID数组不能为空')
    }

    for (const violationId of violationIds) {
      await this.deleteViolation(violationId)
    }

    logger.info(`✅ Batch deleted ${violationIds.length} violation logs`)
  }

  /**
   * 清理过期的违规日志
   * @param {number} retentionDays - 保留天数（0表示不清理）
   * @returns {number} 清理的日志数量
   */
  async cleanupExpiredViolations(retentionDays = null) {
    const retention =
      retentionDays !== null
        ? retentionDays
        : parseInt(process.env.VIOLATION_LOG_RETENTION_DAYS || '90')

    if (retention <= 0) {
      logger.debug('Violation log cleanup disabled (retention = 0)')
      return 0
    }

    const client = redis.getClient()
    if (!client) {
      throw new Error('Redis client is not available')
    }

    const expireTime = Date.now() - retention * 24 * 60 * 60 * 1000

    // 从全局索引中获取过期的日志ID
    const expiredIds = await client.zrangebyscore('violation_logs_global', '-inf', expireTime)

    if (expiredIds.length === 0) {
      logger.debug('No expired violation logs to clean up')
      return 0
    }

    // 批量删除
    for (const violationId of expiredIds) {
      await this.deleteViolation(violationId)
    }

    logger.info(`🧹 Cleaned up ${expiredIds.length} expired violation logs`)
    return expiredIds.length
  }

  /**
   * 获取违规统计信息
   * @param {Object} options - 统计选项 { apiKeyId, startDate, endDate }
   * @returns {Object} 统计数据
   */
  async getViolationStats(options = {}) {
    const { apiKeyId, startDate, endDate } = options

    const result = apiKeyId
      ? await this.getViolationsByApiKey(apiKeyId, {
          page: 1,
          limit: 10000,
          startDate,
          endDate
        })
      : await this.getAllViolations({ page: 1, limit: 10000, startDate, endDate })

    const { logs, total } = result

    const stats = {
      total,
      byCategory: {},
      byApiKey: {},
      byDay: {},
      topMatchedWords: {}
    }

    for (const log of logs) {
      // 按分类统计
      for (const match of log.matchedWords) {
        const category = match.category || 'other'
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1

        // 统计最常命中的敏感词
        stats.topMatchedWords[match.word] = (stats.topMatchedWords[match.word] || 0) + 1
      }

      // 按API Key统计
      stats.byApiKey[log.apiKeyName] = (stats.byApiKey[log.apiKeyName] || 0) + 1

      // 按日期统计
      const day = log.timestamp.split('T')[0]
      stats.byDay[day] = (stats.byDay[day] || 0) + 1
    }

    // 排序topMatchedWords
    stats.topMatchedWords = Object.entries(stats.topMatchedWords)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .reduce((acc, [word, count]) => {
        acc[word] = count
        return acc
      }, {})

    return stats
  }
}

module.exports = new ViolationLogService()
