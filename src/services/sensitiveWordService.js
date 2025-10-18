const { v4: uuidv4 } = require('uuid')
const redis = require('../models/redis')
const logger = require('../utils/logger')
const { LRUCache } = require('lru-cache')

// LRU缓存配置 - 缓存所有敏感词列表
const cache = new LRUCache({
  max: 1, // 只缓存一个对象（所有敏感词列表）
  ttl: 1000 * 60 * 5, // 5分钟TTL
  updateAgeOnGet: true
})

const CACHE_KEY = 'sensitive_words_all'

class SensitiveWordService {
  /**
   * 创建敏感词
   * @param {Object} options - 敏感词配置
   * @returns {Object} 创建的敏感词数据
   */
  async createSensitiveWord(options) {
    const {
      word,
      category = 'other',
      matchType = 'exact',
      enabled = true,
      createdBy = 'admin'
    } = options

    if (!word || typeof word !== 'string' || word.trim().length === 0) {
      throw new Error('敏感词内容不能为空')
    }

    const wordId = uuidv4()
    const now = new Date().toISOString()

    const wordData = {
      id: wordId,
      word: word.trim(),
      category,
      matchType,
      enabled: String(enabled),
      createdBy,
      createdAt: now,
      updatedAt: now
    }

    const client = redis.getClient()
    if (!client) {
      throw new Error('Redis client is not available')
    }

    // 存储敏感词
    await client.hset(`sensitive_word:${wordId}`, wordData)

    // 添加到索引集合
    await client.sadd('sensitive_words_index', wordId)

    // 清除缓存
    cache.del(CACHE_KEY)

    logger.info(`✅ Created sensitive word: ${word} (${category})`)

    return {
      ...wordData,
      enabled: enabled === 'true' || enabled === true
    }
  }

  /**
   * 更新敏感词
   * @param {string} wordId - 敏感词ID
   * @param {Object} updates - 更新内容
   * @returns {Object} 更新后的敏感词数据
   */
  async updateSensitiveWord(wordId, updates) {
    const client = redis.getClient()
    if (!client) {
      throw new Error('Redis client is not available')
    }

    const existing = await client.hgetall(`sensitive_word:${wordId}`)
    if (!existing || Object.keys(existing).length === 0) {
      throw new Error('敏感词不存在')
    }

    const updatedData = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    // 确保enabled字段格式正确
    if ('enabled' in updates) {
      updatedData.enabled = String(updates.enabled)
    }

    await client.hset(`sensitive_word:${wordId}`, updatedData)

    // 清除缓存
    cache.del(CACHE_KEY)

    logger.info(`✅ Updated sensitive word: ${wordId}`)

    return {
      ...updatedData,
      enabled: updatedData.enabled === 'true'
    }
  }

  /**
   * 删除敏感词
   * @param {string} wordId - 敏感词ID
   */
  async deleteSensitiveWord(wordId) {
    const client = redis.getClient()
    if (!client) {
      throw new Error('Redis client is not available')
    }

    await client.del(`sensitive_word:${wordId}`)
    await client.srem('sensitive_words_index', wordId)

    // 清除缓存
    cache.del(CACHE_KEY)

    logger.info(`✅ Deleted sensitive word: ${wordId}`)
  }

  /**
   * 批量删除敏感词
   * @param {Array<string>} wordIds - 敏感词ID数组
   */
  async batchDeleteSensitiveWords(wordIds) {
    if (!Array.isArray(wordIds) || wordIds.length === 0) {
      throw new Error('敏感词ID数组不能为空')
    }

    const client = redis.getClient()
    if (!client) {
      throw new Error('Redis client is not available')
    }

    for (const wordId of wordIds) {
      await client.del(`sensitive_word:${wordId}`)
      await client.srem('sensitive_words_index', wordId)
    }

    // 清除缓存
    cache.del(CACHE_KEY)

    logger.info(`✅ Batch deleted ${wordIds.length} sensitive words`)
  }

  /**
   * 获取单个敏感词
   * @param {string} wordId - 敏感词ID
   * @returns {Object} 敏感词数据
   */
  async getSensitiveWord(wordId) {
    const client = redis.getClient()
    if (!client) {
      throw new Error('Redis client is not available')
    }

    const wordData = await client.hgetall(`sensitive_word:${wordId}`)
    if (!wordData || Object.keys(wordData).length === 0) {
      return null
    }

    return {
      ...wordData,
      enabled: wordData.enabled === 'true'
    }
  }

  /**
   * 获取所有敏感词（带缓存）
   * @param {boolean} onlyEnabled - 只返回启用的敏感词
   * @returns {Array} 敏感词数组
   */
  async getAllSensitiveWords(onlyEnabled = false) {
    // 尝试从缓存获取
    const cached = cache.get(CACHE_KEY)
    if (cached) {
      logger.debug('📦 Sensitive words loaded from cache')
      return onlyEnabled ? cached.filter((w) => w.enabled) : cached
    }

    const client = redis.getClient()
    if (!client) {
      throw new Error('Redis client is not available')
    }

    // 获取所有敏感词ID
    const wordIds = await client.smembers('sensitive_words_index')

    if (!wordIds || wordIds.length === 0) {
      cache.set(CACHE_KEY, [])
      return []
    }

    // 批量获取所有敏感词数据
    const words = []
    for (const wordId of wordIds) {
      const wordData = await client.hgetall(`sensitive_word:${wordId}`)
      if (wordData && Object.keys(wordData).length > 0) {
        words.push({
          ...wordData,
          enabled: wordData.enabled === 'true'
        })
      }
    }

    // 排序：按创建时间倒序
    words.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    // 存入缓存
    cache.set(CACHE_KEY, words)

    logger.debug(`📦 Loaded ${words.length} sensitive words from Redis`)

    return onlyEnabled ? words.filter((w) => w.enabled) : words
  }

  /**
   * 检测文本内容是否包含敏感词
   * @param {string} text - 待检测的文本
   * @returns {Object} 检测结果 { isViolation, matchedWords }
   */
  async checkContent(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return {
        isViolation: false,
        matchedWords: []
      }
    }

    // 获取所有启用的敏感词
    const words = await this.getAllSensitiveWords(true)

    if (words.length === 0) {
      return {
        isViolation: false,
        matchedWords: []
      }
    }

    const matches = []
    const lowerText = text.toLowerCase()

    for (const wordConfig of words) {
      const matchResult = this._matchWord(text, lowerText, wordConfig)

      if (matchResult.matched) {
        matches.push({
          word: wordConfig.word,
          category: wordConfig.category,
          position: matchResult.position
        })
      }
    }

    return {
      isViolation: matches.length > 0,
      matchedWords: matches
    }
  }

  /**
   * 匹配单个敏感词
   * @private
   * @param {string} originalText - 原始文本
   * @param {string} lowerText - 小写文本（用于不区分大小写匹配）
   * @param {Object} wordConfig - 敏感词配置
   * @returns {Object} { matched: boolean, position: number }
   */
  _matchWord(originalText, lowerText, wordConfig) {
    const { word, matchType } = wordConfig

    try {
      switch (matchType) {
        case 'exact': {
          // 精确匹配（不区分大小写）
          const lowerWord = word.toLowerCase()
          const index = lowerText.indexOf(lowerWord)
          return {
            matched: index !== -1,
            position: index
          }
        }

        case 'fuzzy': {
          // 模糊匹配：允许词之间有空格、符号等
          const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const pattern = escapedWord.split('').join('[\\s\\W]*')
          const regex = new RegExp(pattern, 'i')
          const match = originalText.match(regex)
          return {
            matched: match !== null,
            position: match ? match.index : -1
          }
        }

        case 'regex': {
          // 正则表达式匹配
          try {
            const regex = new RegExp(word, 'i')
            const match = originalText.match(regex)
            return {
              matched: match !== null,
              position: match ? match.index : -1
            }
          } catch (error) {
            logger.warn(`⚠️ Invalid regex pattern for word: ${word}`, error)
            return { matched: false, position: -1 }
          }
        }

        default:
          logger.warn(`⚠️ Unknown match type: ${matchType}`)
          return { matched: false, position: -1 }
      }
    } catch (error) {
      logger.error(`❌ Error matching word "${word}":`, error)
      return { matched: false, position: -1 }
    }
  }

  /**
   * 刷新缓存
   */
  refreshCache() {
    cache.del(CACHE_KEY)
    logger.info('🔄 Sensitive words cache cleared')
  }

  /**
   * 批量导入敏感词
   * @param {Array<Object>} words - 敏感词数组
   * @param {string} createdBy - 创建者
   * @returns {Object} 导入结果统计
   */
  async batchImport(words, createdBy = 'admin') {
    if (!Array.isArray(words) || words.length === 0) {
      throw new Error('敏感词数组不能为空')
    }

    let successCount = 0
    let failCount = 0
    const errors = []

    for (const wordData of words) {
      try {
        await this.createSensitiveWord({
          ...wordData,
          createdBy
        })
        successCount++
      } catch (error) {
        failCount++
        errors.push({
          word: wordData.word,
          error: error.message
        })
        logger.error(`❌ Failed to import word "${wordData.word}":`, error)
      }
    }

    logger.info(`📊 Batch import completed: ${successCount} success, ${failCount} failed`)

    return {
      total: words.length,
      success: successCount,
      failed: failCount,
      errors
    }
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计数据
   */
  async getStats() {
    const allWords = await this.getAllSensitiveWords()

    const stats = {
      total: allWords.length,
      enabled: allWords.filter((w) => w.enabled).length,
      disabled: allWords.filter((w) => !w.enabled).length,
      byCategory: {},
      byMatchType: {}
    }

    // 按分类统计
    for (const word of allWords) {
      stats.byCategory[word.category] = (stats.byCategory[word.category] || 0) + 1
      stats.byMatchType[word.matchType] = (stats.byMatchType[word.matchType] || 0) + 1
    }

    return stats
  }
}

module.exports = new SensitiveWordService()
