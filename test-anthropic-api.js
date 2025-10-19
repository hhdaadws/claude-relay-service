/**
 * Test script for testing ClaudeCodeValidator with real Anthropic API
 *
 * This script:
 * 1. Validates Claude Code system prompt detection
 * 2. Makes real API calls to Anthropic API to verify the validator works correctly
 */

require('dotenv').config()
const axios = require('axios')
const ClaudeCodeValidator = require('./src/validators/clients/claudeCodeValidator')

// Configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const CLAUDE_CODE_SYSTEM_PROMPT = "You are Claude Code, Anthropic's official CLI for Claude."

if (!ANTHROPIC_API_KEY) {
  console.error('❌ Error: ANTHROPIC_API_KEY not found in environment variables')
  console.error('Please set ANTHROPIC_API_KEY in your .env file')
  process.exit(1)
}

// Test Case 1: Request WITH Claude Code system prompt
const requestWithClaudeCodePrompt = {
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 100,
  system: [
    {
      type: 'text',
      text: CLAUDE_CODE_SYSTEM_PROMPT
    }
  ],
  messages: [
    {
      role: 'user',
      content: 'Say "Hello from Claude Code test"'
    }
  ]
}

// Test Case 2: Request WITHOUT Claude Code system prompt
const requestWithoutClaudeCodePrompt = {
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 100,
  system: [
    {
      type: 'text',
      text: 'You are a helpful assistant.'
    }
  ],
  messages: [
    {
      role: 'user',
      content: 'Say "Hello from regular test"'
    }
  ]
}

// Test Case 3: Request with NO system prompt
const requestWithNoSystemPrompt = {
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 100,
  messages: [
    {
      role: 'user',
      content: 'Say "Hello from no-system test"'
    }
  ]
}

/**
 * Call Anthropic API
 */
async function callAnthropicAPI(requestBody) {
  try {
    const response = await axios.post(ANTHROPIC_API_URL, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      timeout: 30000
    })

    return {
      success: true,
      data: response.data,
      statusCode: response.status
    }
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      statusCode: error.response?.status
    }
  }
}

/**
 * Run test case
 */
async function runTest(testName, requestBody) {
  console.log('\n' + '='.repeat(80))
  console.log(`TEST: ${testName}`)
  console.log('='.repeat(80))

  // Step 1: Validate using ClaudeCodeValidator
  const isRealClaudeCode = ClaudeCodeValidator.includesClaudeCodeSystemPrompt(requestBody, 1)

  console.log('\n📋 Request Configuration:')
  console.log('  Model:', requestBody.model)
  console.log('  Max Tokens:', requestBody.max_tokens)
  console.log('  System Field:', requestBody.system ? 'Present' : 'Not present')

  if (requestBody.system && Array.isArray(requestBody.system)) {
    requestBody.system.forEach((entry, idx) => {
      const preview = entry.text?.substring(0, 60) + (entry.text?.length > 60 ? '...' : '')
      console.log(`    [${idx}] ${preview}`)
    })
  }

  console.log('\n🔍 Validation Result:')
  console.log(`  Is Real Claude Code: ${isRealClaudeCode ? '✅ YES' : '❌ NO'}`)

  // Step 2: Make actual API call
  console.log('\n📡 Calling Anthropic API...')
  const result = await callAnthropicAPI(requestBody)

  if (result.success) {
    console.log('✅ API Call Successful')
    console.log('  Status Code:', result.statusCode)
    console.log('  Response ID:', result.data.id)
    console.log('  Model:', result.data.model)
    console.log('  Stop Reason:', result.data.stop_reason)

    // Extract response text
    const responseText = result.data.content?.[0]?.text || '(no text content)'
    console.log('  Response:', responseText.substring(0, 100))

    // Show usage
    if (result.data.usage) {
      console.log('  Usage:')
      console.log('    Input tokens:', result.data.usage.input_tokens)
      console.log('    Output tokens:', result.data.usage.output_tokens)
    }
  } else {
    console.log('❌ API Call Failed')
    console.log('  Status Code:', result.statusCode)
    console.log('  Error:', JSON.stringify(result.error, null, 2))
  }

  return {
    testName,
    isRealClaudeCode,
    apiCallSuccess: result.success,
    responseData: result.data
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('\n')
  console.log('╔═══════════════════════════════════════════════════════════════════════════════╗')
  console.log('║  ANTHROPIC API + CLAUDE CODE VALIDATOR TEST SUITE                            ║')
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝')
  console.log('\nUsing API Key:', ANTHROPIC_API_KEY.substring(0, 20) + '...')

  const results = []

  // Run tests
  results.push(await runTest(
    'Request WITH Claude Code System Prompt',
    requestWithClaudeCodePrompt
  ))

  results.push(await runTest(
    'Request WITHOUT Claude Code System Prompt',
    requestWithoutClaudeCodePrompt
  ))

  results.push(await runTest(
    'Request with NO System Prompt',
    requestWithNoSystemPrompt
  ))

  // Summary
  console.log('\n' + '='.repeat(80))
  console.log('TEST SUMMARY')
  console.log('='.repeat(80))

  results.forEach(result => {
    const validationStatus = result.isRealClaudeCode ? '✅ Detected as Claude Code' : '❌ Not Claude Code'
    const apiStatus = result.apiCallSuccess ? '✅ API Success' : '❌ API Failed'
    console.log(`\n${result.testName}`)
    console.log(`  Validation: ${validationStatus}`)
    console.log(`  API Call:   ${apiStatus}`)
  })

  console.log('\n' + '='.repeat(80))
  console.log('✅ All tests completed!')
  console.log('='.repeat(80))
}

// Run tests
main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
