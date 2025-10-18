const sensitiveWordService = require('../services/sensitiveWordService')
const violationLogService = require('../services/violationLogService')
const logger = require('../utils/logger')

/**
 * 内容过滤中间件
 * 检测请求内容是否包含敏感词，如果包含则拒绝请求并记录违规日志
 */
const contentFilterMiddleware = async (req, res, next) => {
  try {
    // 检查功能是否启用
    const filterEnabled = process.env.SENSITIVE_WORD_FILTER_ENABLED !== 'false'
    if (!filterEnabled) {
      return next()
    }

    // 只检查有请求体的POST/PUT请求
    if (!req.body || !req.apiKey) {
      return next()
    }

    // 提取需要检查的文本内容
    const textToCheck = extractTextFromRequest(req.body)

    if (!textToCheck || textToCheck.trim().length === 0) {
      return next()
    }

    // 执行敏感词检测
    const checkResult = await sensitiveWordService.checkContent(textToCheck)

    if (checkResult.isViolation) {
      // 记录违规日志（异步，不阻塞响应）
      violationLogService
        .recordViolation(req.apiKey.id, {
          apiKeyName: req.apiKey.name,
          matchedWords: checkResult.matchedWords,
          contentSample: textToCheck.substring(0, 200),
          requestPath: req.path || req.originalUrl,
          clientIp: req.ip || req.connection?.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          requestId: req.requestId || 'unknown',
          details: {
            method: req.method,
            model: req.body.model || 'unknown',
            messageCount: Array.isArray(req.body.messages) ? req.body.messages.length : 0
          }
        })
        .catch((error) => {
          logger.error('Failed to record violation log:', error)
        })

      // 提取所有命中的分类（去重）
      const matchedCategories = [...new Set(checkResult.matchedWords.map((m) => m.category))]

      logger.security(
        `🚫 Content filter blocked request from ${req.apiKey.name} (${req.apiKey.id}): ` +
          `matched ${checkResult.matchedWords.length} sensitive word(s) in categories: ${matchedCategories.join(', ')}`
      )

      // 返回403错误
      return res.status(403).json({
        error: {
          type: 'content_violation',
          message: '请求内容包含敏感词，已被系统拒绝'
        },
        matchedCategories,
        timestamp: new Date().toISOString()
      })
    }

    // 未检测到敏感词，继续处理请求
    next()
  } catch (error) {
    logger.error('Content filter middleware error:', error)
    // 出错时不阻止请求，记录日志后继续
    // 这样可以避免因过滤系统故障导致服务不可用
    next()
  }
}

/**
 * 从请求体中提取需要检测的文本内容
 * @param {Object} body - 请求体
 * @returns {string} 提取的文本内容
 */
function extractTextFromRequest(body) {
  const texts = []

  try {
    // 提取messages中的文本内容
    if (Array.isArray(body.messages)) {
      for (const msg of body.messages) {
        if (typeof msg.content === 'string') {
          // 简单字符串内容
          texts.push(msg.content)
        } else if (Array.isArray(msg.content)) {
          // 结构化内容数组
          for (const part of msg.content) {
            if (part.type === 'text' && part.text) {
              texts.push(part.text)
            }
            // 可以扩展：检测图片URL、文档内容等
          }
        }
      }
    }

    // 提取system prompt
    if (body.system) {
      if (typeof body.system === 'string') {
        texts.push(body.system)
      } else if (Array.isArray(body.system)) {
        for (const part of body.system) {
          if (part.type === 'text' && part.text) {
            texts.push(part.text)
          }
        }
      }
    }

    // 提取prompt字段（某些API格式）
    if (body.prompt && typeof body.prompt === 'string') {
      texts.push(body.prompt)
    }

    // 提取contents字段（Gemini API格式）
    if (Array.isArray(body.contents)) {
      for (const content of body.contents) {
        if (Array.isArray(content.parts)) {
          for (const part of content.parts) {
            if (part.text) {
              texts.push(part.text)
            }
          }
        }
      }
    }
  } catch (error) {
    logger.error('Error extracting text from request:', error)
    return ''
  }

  return texts.join('\n')
}

module.exports = contentFilterMiddleware
