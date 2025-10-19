const axios = require('axios')
const crypto = require('crypto')

/**
 * 测试 Claude Code 模式的请求
 * 包含 Claude Code 特定的 headers 和系统提示词
 */
async function testClaudeCodeRequest() {
  // 请设置你的 API Key
  const apiKey = process.env.TEST_API_KEY || 'cr_your_api_key_here'
  const baseURL = process.env.BASE_URL || 'http://127.0.0.1:3000'

  console.log('🤖 测试 Claude Code 模式请求')
  console.log('📍 Base URL:', baseURL)
  console.log('🔑 API Key:', apiKey.substring(0, 10) + '...')
  console.log('=' .repeat(60))

  // 生成 Claude Code 格式的 user_id
  // 格式: user_{64位字符串}_account__session_{哈希值}
  const userHash = crypto.randomBytes(32).toString('hex') // 64位
  const sessionId = crypto.randomUUID()
  const userId = `user_${userHash}_account__session_${sessionId}`

  console.log('👤 生成的 user_id:', userId)
  console.log('')

  try {
    const response = await axios.post(
      `${baseURL}/api/v1/messages`,
      {
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 100,
        // Claude Code 的系统提示词
        system: [
          {
            type: 'text',
            text: "You are Claude Code, Anthropic's official CLI for Claude."
          }
        ],
        messages: [
          {
            role: 'user',
            content: 'Hello! Please respond with "Claude Code request successful".'
          }
        ],
        // Claude Code 的 metadata
        metadata: {
          user_id: userId
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          // Claude Code 特定的 User-Agent（正确格式）
          'User-Agent': 'claude-cli/1.0.110 (external, cli)',
          // Claude Code 必需的 headers
          'x-app': 'claude-code',
          'anthropic-beta': 'max-tokens-3-5-sonnet-2024-07-15=200000,prompt-caching-2024-07-31',
          'anthropic-version': '2023-06-01'
        },
        timeout: 30000
      }
    )

    console.log('✅ Claude Code 请求成功!')
    console.log('📊 状态码:', response.status)
    console.log('📝 响应数据:')
    console.log(JSON.stringify(response.data, null, 2))
    console.log('=' .repeat(60))
    return true
  } catch (error) {
    console.log('❌ Claude Code 请求失败!')
    if (error.response) {
      console.log('📊 状态码:', error.response.status)
      console.log('📝 错误响应:')
      console.log(JSON.stringify(error.response.data, null, 2))
    } else {
      console.log('💥 错误信息:', error.message)
    }
    console.log('=' .repeat(60))
    return false
  }
}

// 如果直接运行此文件
if (require.main === module) {
  testClaudeCodeRequest()
    .then((success) => {
      process.exit(success ? 0 : 1)
    })
    .catch((error) => {
      console.error('💥 未捕获的错误:', error)
      process.exit(1)
    })
}

module.exports = { testClaudeCodeRequest }
