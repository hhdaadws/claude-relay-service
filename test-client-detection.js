const { testNormalAnthropicRequest } = require('./test-normal-anthropic')
const { testClaudeCodeRequest } = require('./test-claude-code-mode')

/**
 * 测试客户端检测系统
 * 1. 测试普通 Anthropic 请求（不应被识别为 Claude Code）
 * 2. 测试 Claude Code 模式请求（应被正确识别）
 */
async function runClientDetectionTests() {
  console.log('🔍 客户端检测系统测试')
  console.log('=' .repeat(60))
  console.log('')

  // 提示用户设置 API Key
  if (!process.env.TEST_API_KEY) {
    console.log('⚠️  警告: 未设置 TEST_API_KEY 环境变量')
    console.log('请使用以下命令之一设置:')
    console.log('  export TEST_API_KEY=cr_your_api_key_here')
    console.log('  TEST_API_KEY=cr_your_api_key_here node test-client-detection.js')
    console.log('')
    console.log('💡 您可以使用以下命令查看现有的 API Keys:')
    console.log('  npm run cli keys list')
    console.log('')
    console.log('或者创建一个新的测试 API Key:')
    console.log('  npm run cli keys create -- --name "Test Key" --limit 100000')
    console.log('')
    process.exit(1)
  }

  const results = {
    normal: false,
    claudeCode: false
  }

  // 测试 1: 普通 Anthropic 请求
  console.log('📋 测试 1: 普通 Anthropic API 格式')
  console.log('-'.repeat(60))
  results.normal = await testNormalAnthropicRequest()
  console.log('')

  // 等待一下，避免请求过快
  await new Promise(resolve => setTimeout(resolve, 1000))

  // 测试 2: Claude Code 模式请求
  console.log('📋 测试 2: Claude Code 模式')
  console.log('-'.repeat(60))
  results.claudeCode = await testClaudeCodeRequest()
  console.log('')

  // 总结
  console.log('=' .repeat(60))
  console.log('📊 测试总结')
  console.log('=' .repeat(60))
  console.log(`普通 Anthropic 请求: ${results.normal ? '✅ 成功' : '❌ 失败'}`)
  console.log(`Claude Code 模式请求: ${results.claudeCode ? '✅ 成功' : '❌ 失败'}`)
  console.log('')

  if (results.normal && results.claudeCode) {
    console.log('🎉 所有测试通过! 客户端检测系统工作正常。')
    console.log('')
    console.log('💡 提示: 查看服务器日志了解更多详细信息:')
    console.log('  tail -f logs/claude-relay-*.log')
    process.exit(0)
  } else {
    console.log('⚠️  部分测试失败，请检查服务器日志获取详细信息。')
    console.log('')
    console.log('📝 查看日志:')
    console.log('  tail -f logs/claude-relay-*.log')
    console.log('  tail -f logs/claude-relay-error-*.log')
    process.exit(1)
  }
}

// 运行测试
runClientDetectionTests().catch((error) => {
  console.error('💥 测试执行出错:', error)
  process.exit(1)
})
