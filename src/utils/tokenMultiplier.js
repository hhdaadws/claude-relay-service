const redis = require('../models/redis')
const logger = require('./logger')

/**
 * Token 倍率工具类
 * 用于实现动态价格调整：通过修改返回给用户的 token 数量来调整价格
 *
 * 核心思路：
 * - 设置倍率为 1.1，相当于价格上调 10%（token 数量 * 1.1）
 * - 设置倍率为 0.9，相当于价格下调 10%（token 数量 * 0.9）
 * - 模型价格表保持不变，只修改 token 计数
 *
 * 特性：
 * - 支持动态配置，无需重启服务
 * - 前端可实时修改
 * - 内存缓存减少 Redis 查询
 * - 用户和计费系统看到的数据完全一致
 */
class TokenMultiplier {
  constructor() {
    this.redisKey = 'global:token_multiplier'
    this.historyKey = 'global:token_multiplier_history'

    // 缓存配置
    this.cacheExpiry = 30000 // 30秒缓存，减少 Redis 查询
    this.cachedMultiplier = null
    this.cacheTime = null

    // 倍率范围限制
    this.minMultiplier = 0.1
    this.maxMultiplier = 10.0
    this.defaultMultiplier = 1.0 // 默认不修改
  }

  /**
   * 获取当前倍率（带缓存）
   * @returns {Promise<number>} 倍率值
   */
  async getMultiplier() {
    try {
      // 检查缓存是否有效
      const now = Date.now()
      if (
        this.cachedMultiplier !== null &&
        this.cacheTime !== null &&
        now - this.cacheTime < this.cacheExpiry
      ) {
        return this.cachedMultiplier
      }

      // 从 Redis 读取
      const client = redis.getClientSafe()
      const value = await client.get(this.redisKey)

      let multiplier = this.defaultMultiplier
      if (value !== null) {
        const parsed = parseFloat(value)
        if (!isNaN(parsed) && parsed >= this.minMultiplier && parsed <= this.maxMultiplier) {
          multiplier = parsed
        } else {
          logger.warn(
            `⚠️ Invalid token multiplier value in Redis: ${value}, using default: ${this.defaultMultiplier}`
          )
        }
      }

      // 更新缓存
      this.cachedMultiplier = multiplier
      this.cacheTime = now

      logger.debug(`📊 Token multiplier loaded: ${multiplier} (cached for 30s)`)
      return multiplier
    } catch (error) {
      logger.error('❌ Failed to get token multiplier from Redis:', error)
      // 出错时使用缓存值或默认值
      return this.cachedMultiplier !== null ? this.cachedMultiplier : this.defaultMultiplier
    }
  }

  /**
   * 设置倍率
   * @param {number} value - 倍率值（0.1 - 10.0）
   * @param {string} operator - 操作者（用于审计日志）
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async setMultiplier(value, operator = 'system') {
    try {
      // 验证输入
      const multiplier = parseFloat(value)
      if (isNaN(multiplier)) {
        return {
          success: false,
          message: 'Invalid multiplier value: must be a number'
        }
      }

      if (multiplier < this.minMultiplier || multiplier > this.maxMultiplier) {
        return {
          success: false,
          message: `Multiplier must be between ${this.minMultiplier} and ${this.maxMultiplier}`
        }
      }

      // 保存到 Redis
      const client = redis.getClientSafe()
      await client.set(this.redisKey, multiplier.toString())

      // 记录历史
      await this._recordHistory(multiplier, operator)

      // 清除缓存，强制下次重新读取
      this.cachedMultiplier = null
      this.cacheTime = null

      logger.success(
        `✅ Token multiplier updated: ${multiplier} (operator: ${operator})`
      )

      return {
        success: true,
        message: `Token multiplier set to ${multiplier}`,
        value: multiplier
      }
    } catch (error) {
      logger.error('❌ Failed to set token multiplier:', error)
      return {
        success: false,
        message: `Failed to set multiplier: ${error.message}`
      }
    }
  }

  /**
   * 应用倍率到 usage 对象
   * @param {Object} usage - 原始 usage 对象
   * @returns {Promise<Object>} 应用倍率后的 usage 对象
   */
  async applyToUsage(usage) {
    try {
      // 如果没有 usage 数据，直接返回
      if (!usage || typeof usage !== 'object') {
        return usage
      }

      const multiplier = await this.getMultiplier()

      // 如果倍率为 1.0，不需要修改
      if (multiplier === 1.0) {
        return usage
      }

      // 复制对象，避免修改原始数据
      const modifiedUsage = { ...usage }

      // 应用倍率到各种 token 类型
      if (modifiedUsage.input_tokens !== undefined) {
        modifiedUsage.input_tokens = Math.round(modifiedUsage.input_tokens * multiplier)
      }

      if (modifiedUsage.output_tokens !== undefined) {
        modifiedUsage.output_tokens = Math.round(modifiedUsage.output_tokens * multiplier)
      }

      if (modifiedUsage.cache_creation_input_tokens !== undefined) {
        modifiedUsage.cache_creation_input_tokens = Math.round(
          modifiedUsage.cache_creation_input_tokens * multiplier
        )
      }

      if (modifiedUsage.cache_read_input_tokens !== undefined) {
        modifiedUsage.cache_read_input_tokens = Math.round(
          modifiedUsage.cache_read_input_tokens * multiplier
        )
      }

      // 处理嵌套的 cache_creation 对象（包含 ephemeral_5m 和 ephemeral_1h）
      if (modifiedUsage.cache_creation && typeof modifiedUsage.cache_creation === 'object') {
        modifiedUsage.cache_creation = { ...modifiedUsage.cache_creation }

        if (modifiedUsage.cache_creation.ephemeral_5m_input_tokens !== undefined) {
          modifiedUsage.cache_creation.ephemeral_5m_input_tokens = Math.round(
            modifiedUsage.cache_creation.ephemeral_5m_input_tokens * multiplier
          )
        }

        if (modifiedUsage.cache_creation.ephemeral_1h_input_tokens !== undefined) {
          modifiedUsage.cache_creation.ephemeral_1h_input_tokens = Math.round(
            modifiedUsage.cache_creation.ephemeral_1h_input_tokens * multiplier
          )
        }
      }

      // 记录调试信息（仅在倍率不为1时）
      if (multiplier !== 1.0) {
        logger.debug(
          `🔢 Applied token multiplier ${multiplier}: ` +
            `input ${usage.input_tokens || 0} → ${modifiedUsage.input_tokens || 0}, ` +
            `output ${usage.output_tokens || 0} → ${modifiedUsage.output_tokens || 0}`
        )
      }

      return modifiedUsage
    } catch (error) {
      logger.error('❌ Failed to apply token multiplier:', error)
      // 出错时返回原始数据
      return usage
    }
  }

  /**
   * 获取倍率历史记录
   * @param {number} limit - 返回记录数量限制
   * @returns {Promise<Array>} 历史记录数组
   */
  async getHistory(limit = 10) {
    try {
      const client = redis.getClientSafe()
      const records = await client.lrange(this.historyKey, 0, limit - 1)

      return records.map((record) => {
        try {
          return JSON.parse(record)
        } catch (e) {
          return null
        }
      }).filter(Boolean)
    } catch (error) {
      logger.error('❌ Failed to get token multiplier history:', error)
      return []
    }
  }

  /**
   * 清除倍率设置（恢复默认值 1.0）
   * @param {string} operator - 操作者
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async reset(operator = 'system') {
    return this.setMultiplier(this.defaultMultiplier, operator)
  }

  /**
   * 获取当前配置信息
   * @returns {Promise<Object>} 配置信息
   */
  async getInfo() {
    const multiplier = await this.getMultiplier()
    const history = await this.getHistory(5)

    return {
      currentMultiplier: multiplier,
      isActive: multiplier !== this.defaultMultiplier,
      priceAdjustment: multiplier !== 1.0 ? `${((multiplier - 1) * 100).toFixed(1)}%` : '0%',
      range: {
        min: this.minMultiplier,
        max: this.maxMultiplier,
        default: this.defaultMultiplier
      },
      cache: {
        enabled: true,
        expirySeconds: this.cacheExpiry / 1000,
        isCached: this.cachedMultiplier !== null
      },
      recentHistory: history
    }
  }

  /**
   * 记录历史变更（内部方法）
   * @private
   */
  async _recordHistory(multiplier, operator) {
    try {
      const client = redis.getClientSafe()
      const record = JSON.stringify({
        multiplier,
        operator,
        timestamp: new Date().toISOString(),
        priceAdjustment: `${((multiplier - 1) * 100).toFixed(1)}%`
      })

      // 添加到列表头部
      await client.lpush(this.historyKey, record)

      // 只保留最近 50 条记录
      await client.ltrim(this.historyKey, 0, 49)
    } catch (error) {
      logger.error('❌ Failed to record token multiplier history:', error)
    }
  }
}

// 导出单例
module.exports = new TokenMultiplier()
