const axios = require('axios')

/**
 * 测试普通的 Anthropic API 格式请求
 * 不使用 Claude Code 特定的 headers 和系统提示词
 */
async function testNormalAnthropicRequest() {
  // 请设置你的 API Key
  const apiKey = process.env.TEST_API_KEY || 'cr_your_api_key_here'
  const baseURL = process.env.BASE_URL || 'http://127.0.0.1:3000'

  console.log('🧪 测试普通 Anthropic API 请求')
  console.log('📍 Base URL:', baseURL)
  console.log('🔑 API Key:', apiKey.substring(0, 10) + '...')
  console.log('=' .repeat(60))

  try {
    const response = await axios.post(
      `${baseURL}/api/v1/messages`,
      {
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: 'Hello! Please respond with "normal request successful".'
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          // 普通的 User-Agent，不是 Claude Code 的格式
          'User-Agent': 'test-client/1.0.0'
        },
        timeout: 30000
      }
    )

    console.log('✅ 普通请求成功!')
    console.log('📊 状态码:', response.status)
    console.log('📝 响应数据:')
    console.log(JSON.stringify(response.data, null, 2))
    console.log('=' .repeat(60))
    return true
  } catch (error) {
    console.log('❌ 普通请求失败!')
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
  testNormalAnthropicRequest()
    .then((success) => {
      process.exit(success ? 0 : 1)
    })
    .catch((error) => {
      console.error('💥 未捕获的错误:', error)
      process.exit(1)
    })
}

module.exports = { testNormalAnthropicRequest }
