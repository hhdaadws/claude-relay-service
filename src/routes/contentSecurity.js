const express = require('express')
const sensitiveWordService = require('../services/sensitiveWordService')
const violationLogService = require('../services/violationLogService')
const { authenticateAdmin } = require('../middleware/auth')
const logger = require('../utils/logger')

const router = express.Router()

// ========================================
// 敏感词管理路由
// ========================================

// 创建敏感词
router.post('/sensitive-words', authenticateAdmin, async (req, res) => {
  try {
    const { word, category, matchType, enabled } = req.body

    if (!word || typeof word !== 'string' || word.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: '敏感词内容不能为空'
      })
    }

    const wordData = await sensitiveWordService.createSensitiveWord({
      word: word.trim(),
      category: category || 'other',
      matchType: matchType || 'exact',
      enabled: enabled !== false,
      createdBy: req.admin.username
    })

    logger.info(`Admin ${req.admin.username} created sensitive word: ${word}`)

    res.json({
      success: true,
      data: wordData
    })
  } catch (error) {
    logger.error('Create sensitive word error:', error)
    res.status(500).json({
      error: 'Failed to create sensitive word',
      message: error.message
    })
  }
})

// 获取所有敏感词
router.get('/sensitive-words', authenticateAdmin, async (req, res) => {
  try {
    const { onlyEnabled } = req.query
    const words = await sensitiveWordService.getAllSensitiveWords(onlyEnabled === 'true')

    res.json({
      success: true,
      data: words,
      total: words.length
    })
  } catch (error) {
    logger.error('Get sensitive words error:', error)
    res.status(500).json({
      error: 'Failed to get sensitive words',
      message: error.message
    })
  }
})

// 获取单个敏感词
router.get('/sensitive-words/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const word = await sensitiveWordService.getSensitiveWord(id)

    if (!word) {
      return res.status(404).json({
        error: 'Not found',
        message: '敏感词不存在'
      })
    }

    res.json({
      success: true,
      data: word
    })
  } catch (error) {
    logger.error(`Get sensitive word ${req.params.id} error:`, error)
    res.status(500).json({
      error: 'Failed to get sensitive word',
      message: error.message
    })
  }
})

// 更新敏感词
router.put('/sensitive-words/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { word, category, matchType, enabled } = req.body

    const updates = {}
    if (word !== undefined) {
      updates.word = word.trim()
    }
    if (category !== undefined) {
      updates.category = category
    }
    if (matchType !== undefined) {
      updates.matchType = matchType
    }
    if (enabled !== undefined) {
      updates.enabled = enabled
    }

    const wordData = await sensitiveWordService.updateSensitiveWord(id, updates)

    logger.info(`Admin ${req.admin.username} updated sensitive word: ${id}`)

    res.json({
      success: true,
      data: wordData
    })
  } catch (error) {
    logger.error(`Update sensitive word ${req.params.id} error:`, error)
    res.status(500).json({
      error: 'Failed to update sensitive word',
      message: error.message
    })
  }
})

// 删除敏感词
router.delete('/sensitive-words/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params
    await sensitiveWordService.deleteSensitiveWord(id)

    logger.info(`Admin ${req.admin.username} deleted sensitive word: ${id}`)

    res.json({
      success: true,
      message: '敏感词删除成功'
    })
  } catch (error) {
    logger.error(`Delete sensitive word ${req.params.id} error:`, error)
    res.status(500).json({
      error: 'Failed to delete sensitive word',
      message: error.message
    })
  }
})

// 批量删除敏感词
router.post('/sensitive-words/batch-delete', authenticateAdmin, async (req, res) => {
  try {
    const { ids } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: '请提供要删除的敏感词ID数组'
      })
    }

    await sensitiveWordService.batchDeleteSensitiveWords(ids)

    logger.info(`Admin ${req.admin.username} batch deleted ${ids.length} sensitive words`)

    res.json({
      success: true,
      message: `成功删除 ${ids.length} 个敏感词`
    })
  } catch (error) {
    logger.error('Batch delete sensitive words error:', error)
    res.status(500).json({
      error: 'Failed to batch delete sensitive words',
      message: error.message
    })
  }
})

// 批量导入敏感词
router.post('/sensitive-words/batch-import', authenticateAdmin, async (req, res) => {
  try {
    const { words } = req.body

    if (!Array.isArray(words) || words.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: '请提供要导入的敏感词数组'
      })
    }

    const result = await sensitiveWordService.batchImport(words, req.admin.username)

    logger.info(
      `Admin ${req.admin.username} batch imported ${result.success} sensitive words (${result.failed} failed)`
    )

    res.json({
      success: true,
      data: result,
      message: `成功导入 ${result.success} 个敏感词，失败 ${result.failed} 个`
    })
  } catch (error) {
    logger.error('Batch import sensitive words error:', error)
    res.status(500).json({
      error: 'Failed to batch import sensitive words',
      message: error.message
    })
  }
})

// 测试内容检测
router.post('/sensitive-words/test', authenticateAdmin, async (req, res) => {
  try {
    const { text } = req.body

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: '请提供要测试的文本内容'
      })
    }

    const result = await sensitiveWordService.checkContent(text)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    logger.error('Test content detection error:', error)
    res.status(500).json({
      error: 'Failed to test content detection',
      message: error.message
    })
  }
})

// 获取敏感词统计信息
router.get('/sensitive-words-stats', authenticateAdmin, async (req, res) => {
  try {
    const stats = await sensitiveWordService.getStats()

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    logger.error('Get sensitive words stats error:', error)
    res.status(500).json({
      error: 'Failed to get sensitive words stats',
      message: error.message
    })
  }
})

// 刷新敏感词缓存
router.post('/sensitive-words/refresh-cache', authenticateAdmin, async (req, res) => {
  try {
    sensitiveWordService.refreshCache()

    logger.info(`Admin ${req.admin.username} refreshed sensitive words cache`)

    res.json({
      success: true,
      message: '缓存刷新成功'
    })
  } catch (error) {
    logger.error('Refresh cache error:', error)
    res.status(500).json({
      error: 'Failed to refresh cache',
      message: error.message
    })
  }
})

// ========================================
// 违规日志管理路由
// ========================================

// 获取所有违规日志（支持分页和筛选）
router.get('/violation-logs', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, apiKeyId, startDate, endDate } = req.query

    const result = await violationLogService.getAllViolations({
      page: parseInt(page),
      limit: parseInt(limit),
      apiKeyId,
      startDate,
      endDate
    })

    res.json({
      success: true,
      data: result.logs,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: Math.ceil(result.total / result.limit)
      }
    })
  } catch (error) {
    logger.error('Get violation logs error:', error)
    res.status(500).json({
      error: 'Failed to get violation logs',
      message: error.message
    })
  }
})

// 获取指定API Key的违规日志
router.get('/violation-logs/by-key/:apiKeyId', authenticateAdmin, async (req, res) => {
  try {
    const { apiKeyId } = req.params
    const { page = 1, limit = 50, startDate, endDate } = req.query

    const result = await violationLogService.getViolationsByApiKey(apiKeyId, {
      page: parseInt(page),
      limit: parseInt(limit),
      startDate,
      endDate
    })

    res.json({
      success: true,
      data: result.logs,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: Math.ceil(result.total / result.limit)
      }
    })
  } catch (error) {
    logger.error(`Get violation logs for key ${req.params.apiKeyId} error:`, error)
    res.status(500).json({
      error: 'Failed to get violation logs',
      message: error.message
    })
  }
})

// 获取单条违规日志详情
router.get('/violation-logs/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const log = await violationLogService.getViolation(id)

    if (!log) {
      return res.status(404).json({
        error: 'Not found',
        message: '违规日志不存在'
      })
    }

    res.json({
      success: true,
      data: log
    })
  } catch (error) {
    logger.error(`Get violation log ${req.params.id} error:`, error)
    res.status(500).json({
      error: 'Failed to get violation log',
      message: error.message
    })
  }
})

// 删除单条违规日志
router.delete('/violation-logs/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params
    await violationLogService.deleteViolation(id)

    logger.info(`Admin ${req.admin.username} deleted violation log: ${id}`)

    res.json({
      success: true,
      message: '违规日志删除成功'
    })
  } catch (error) {
    logger.error(`Delete violation log ${req.params.id} error:`, error)
    res.status(500).json({
      error: 'Failed to delete violation log',
      message: error.message
    })
  }
})

// 批量删除违规日志
router.post('/violation-logs/batch-delete', authenticateAdmin, async (req, res) => {
  try {
    const { ids } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: '请提供要删除的违规日志ID数组'
      })
    }

    await violationLogService.batchDeleteViolations(ids)

    logger.info(`Admin ${req.admin.username} batch deleted ${ids.length} violation logs`)

    res.json({
      success: true,
      message: `成功删除 ${ids.length} 条违规日志`
    })
  } catch (error) {
    logger.error('Batch delete violation logs error:', error)
    res.status(500).json({
      error: 'Failed to batch delete violation logs',
      message: error.message
    })
  }
})

// 清理过期的违规日志
router.post('/violation-logs/cleanup', authenticateAdmin, async (req, res) => {
  try {
    const { retentionDays } = req.body

    const cleanedCount = await violationLogService.cleanupExpiredViolations(
      retentionDays !== undefined ? parseInt(retentionDays) : null
    )

    logger.info(`Admin ${req.admin.username} cleaned up ${cleanedCount} expired violation logs`)

    res.json({
      success: true,
      message: `成功清理 ${cleanedCount} 条过期违规日志`,
      cleanedCount
    })
  } catch (error) {
    logger.error('Cleanup expired violation logs error:', error)
    res.status(500).json({
      error: 'Failed to cleanup expired violation logs',
      message: error.message
    })
  }
})

// 获取违规统计信息
router.get('/violation-stats', authenticateAdmin, async (req, res) => {
  try {
    const { apiKeyId, startDate, endDate } = req.query

    const stats = await violationLogService.getViolationStats({
      apiKeyId,
      startDate,
      endDate
    })

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    logger.error('Get violation stats error:', error)
    res.status(500).json({
      error: 'Failed to get violation stats',
      message: error.message
    })
  }
})

module.exports = router
