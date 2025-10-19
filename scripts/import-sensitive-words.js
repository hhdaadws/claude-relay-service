#!/usr/bin/env node

/**
 * 导入初始敏感词脚本
 * Import Initial Sensitive Words Script
 *
 * 使用方法 / Usage:
 * node scripts/import-sensitive-words.js [--file path/to/words.json] [--dry-run]
 */

const fs = require('fs')
const path = require('path')
const redisClient = require('../src/models/redis')
const sensitiveWordService = require('../src/services/sensitiveWordService')
const logger = require('../src/utils/logger')

// 解析命令行参数
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const fileIndex = args.indexOf('--file')
const filePath =
  fileIndex !== -1 && args[fileIndex + 1]
    ? args[fileIndex + 1]
    : path.join(__dirname, '../data/initial-sensitive-words.json')

async function importSensitiveWords() {
  try {
    // 初始化Redis连接
    console.log('🔗 正在连接到Redis...')
    await redisClient.connect()
    console.log('✅ Redis连接成功')
    console.log('')

    console.log('🚀 开始导入敏感词...')
    console.log(`📁 文件路径: ${filePath}`)
    console.log(`🔍 模式: ${dryRun ? '试运行（不会实际导入）' : '正式导入'}`)
    console.log('')

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.error(`❌ 错误: 文件不存在: ${filePath}`)
      process.exit(1)
    }

    // 读取文件
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const words = JSON.parse(fileContent)

    if (!Array.isArray(words) || words.length === 0) {
      console.error('❌ 错误: 文件格式不正确或为空数组')
      process.exit(1)
    }

    console.log(`📊 共找到 ${words.length} 个敏感词`)
    console.log('')

    // 验证每个词的格式
    const invalidWords = []
    words.forEach((word, index) => {
      if (!word.word || typeof word.word !== 'string' || word.word.trim() === '') {
        invalidWords.push({ index, reason: '缺少有效的 word 字段' })
      }
      if (word.category && !['nsfw', 'violence', 'politics', 'other'].includes(word.category)) {
        invalidWords.push({ index, reason: `无效的分类: ${word.category}` })
      }
      if (word.matchType && !['exact', 'fuzzy', 'regex'].includes(word.matchType)) {
        invalidWords.push({ index, reason: `无效的匹配方式: ${word.matchType}` })
      }
    })

    if (invalidWords.length > 0) {
      console.error('❌ 发现格式错误的敏感词:')
      invalidWords.forEach(({ index, reason }) => {
        console.error(`   [${index}] ${reason}`)
      })
      process.exit(1)
    }

    // 统计信息
    const stats = {
      total: words.length,
      byCategory: {},
      byMatchType: {},
      enabled: 0,
      disabled: 0
    }

    words.forEach((word) => {
      const category = word.category || 'other'
      const matchType = word.matchType || 'exact'
      const enabled = word.enabled !== false

      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1
      stats.byMatchType[matchType] = (stats.byMatchType[matchType] || 0) + 1
      if (enabled) {
        stats.enabled++
      } else {
        stats.disabled++
      }
    })

    console.log('📈 统计信息:')
    console.log(`   总数: ${stats.total}`)
    console.log(`   启用: ${stats.enabled} | 禁用: ${stats.disabled}`)
    console.log('')
    console.log('   按分类:')
    Object.entries(stats.byCategory).forEach(([category, count]) => {
      const label = {
        nsfw: 'NSFW/色情',
        violence: '暴力',
        politics: '政治',
        other: '其他'
      }[category]
      console.log(`     ${label}: ${count}`)
    })
    console.log('')
    console.log('   按匹配方式:')
    Object.entries(stats.byMatchType).forEach(([type, count]) => {
      const label = {
        exact: '精确匹配',
        fuzzy: '模糊匹配',
        regex: '正则表达式'
      }[type]
      console.log(`     ${label}: ${count}`)
    })
    console.log('')

    if (dryRun) {
      console.log('ℹ️  试运行模式，不会实际导入数据')
      console.log('')
      console.log('示例敏感词（前5个）:')
      words.slice(0, 5).forEach((word, index) => {
        console.log(
          `   ${index + 1}. ${word.word} [${word.category || 'other'}] [${word.matchType || 'exact'}]`
        )
      })
      console.log('')
      console.log('✅ 试运行完成！如需实际导入，请移除 --dry-run 参数')
      process.exit(0)
    }

    // 检查是否已有敏感词
    const existingWords = await sensitiveWordService.getAllSensitiveWords()
    if (existingWords.length > 0) {
      console.log(`⚠️  警告: 数据库中已存在 ${existingWords.length} 个敏感词`)
      console.log('   本次导入将添加新的敏感词，不会删除或修改现有敏感词')
      console.log('')
    }

    // 批量导入
    console.log('📥 开始导入敏感词...')
    const result = await sensitiveWordService.batchImport(words, 'import-script')

    console.log('')
    console.log('✅ 导入完成！')
    console.log(`   成功: ${result.success}`)
    console.log(`   失败: ${result.failed}`)
    console.log(`   总计: ${result.total}`)

    if (result.errors && result.errors.length > 0) {
      console.log('')
      console.log('❌ 导入错误详情:')
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`)
      })
    }

    // 最终验证
    const finalWords = await sensitiveWordService.getAllSensitiveWords()
    console.log('')
    console.log(`📊 当前数据库中共有 ${finalWords.length} 个敏感词`)

    // 断开Redis连接
    await redisClient.disconnect()
    process.exit(result.failed > 0 ? 1 : 0)
  } catch (error) {
    console.error('❌ 导入失败:', error.message)
    logger.error('Failed to import sensitive words:', error)

    // 确保断开Redis连接
    try {
      await redisClient.disconnect()
    } catch (disconnectError) {
      // 忽略断开连接错误
    }

    process.exit(1)
  }
}

// 执行导入
importSensitiveWords()
