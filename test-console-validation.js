/**
 * Test script for Console channel Claude Code validation
 *
 * This script tests the claudeConsoleRelayService strict validation with various scenarios:
 * 1. Compliant Claude Code request (full headers + UA + exact system prompt + user_id)
 * 2. Missing specific headers
 * 3. Incorrect User-Agent
 * 4. Missing Claude Code system prompt
 * 5. Missing user_id or invalid format
 */

const relayService = require('./src/services/claudeConsoleRelayService')

// Test data
const CLAUDE_CODE_SYSTEM_PROMPT = "You are Claude Code, Anthropic's official CLI for Claude."

// Test Case 1: Compliant Claude Code request (完整的真实请求)
const compliantRequest = {
  headers: {
    'user-agent': 'claude-cli/1.0.69 (darwin, arm64)',
    'x-app': 'claude-code',
    'anthropic-beta': 'prompt-caching-2024-07-31',
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json'
  },
  path: '/v1/messages',
  body: {
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8192,
    system: [
      {
        type: 'text',
        text: CLAUDE_CODE_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' }
      }
    ],
    messages: [
      {
        role: 'user',
        content: 'Hello, Claude Code!'
      }
    ],
    metadata: {
      user_id: 'user_d98385411c93cd074b2cefd5c9831fe77f24a53e4ecdcd1f830bba586fe62cb9_account__session_17cf0fd3-d51b-4b59-977d-b899dafb3022'
    }
  }
}

// Test Case 2: Missing x-app header
const missingHeaderRequest = {
  headers: {
    'user-agent': 'claude-cli/1.0.69 (darwin, arm64)',
    // 'x-app': 'claude-code', // Missing
    'anthropic-beta': 'prompt-caching-2024-07-31',
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json'
  },
  path: '/v1/messages',
  body: {
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8192,
    system: [
      {
        type: 'text',
        text: CLAUDE_CODE_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' }
      }
    ],
    messages: [
      {
        role: 'user',
        content: 'Hello, Claude Code!'
      }
    ],
    metadata: {
      user_id: 'user_d98385411c93cd074b2cefd5c9831fe77f24a53e4ecdcd1f830bba586fe62cb9_account__session_17cf0fd3-d51b-4b59-977d-b899dafb3022'
    }
  }
}

// Test Case 3: Incorrect User-Agent
const incorrectUserAgentRequest = {
  headers: {
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    'x-app': 'claude-code',
    'anthropic-beta': 'prompt-caching-2024-07-31',
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json'
  },
  path: '/v1/messages',
  body: {
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8192,
    system: [
      {
        type: 'text',
        text: CLAUDE_CODE_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' }
      }
    ],
    messages: [
      {
        role: 'user',
        content: 'Hello, Claude Code!'
      }
    ],
    metadata: {
      user_id: 'user_d98385411c93cd074b2cefd5c9831fe77f24a53e4ecdcd1f830bba586fe62cb9_account__session_17cf0fd3-d51b-4b59-977d-b899dafb3022'
    }
  }
}

// Test Case 4: Missing Claude Code system prompt
const missingSystemPromptRequest = {
  headers: {
    'user-agent': 'claude-cli/1.0.69 (darwin, arm64)',
    'x-app': 'claude-code',
    'anthropic-beta': 'prompt-caching-2024-07-31',
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json'
  },
  path: '/v1/messages',
  body: {
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8192,
    system: [
      {
        type: 'text',
        text: 'You are a helpful assistant.'
      }
    ],
    messages: [
      {
        role: 'user',
        content: 'Hello!'
      }
    ],
    metadata: {
      user_id: 'user_d98385411c93cd074b2cefd5c9831fe77f24a53e4ecdcd1f830bba586fe62cb9_account__session_17cf0fd3-d51b-4b59-977d-b899dafb3022'
    }
  }
}

// Test Case 5: No system field at all
const noSystemFieldRequest = {
  headers: {
    'user-agent': 'claude-cli/1.0.69 (darwin, arm64)',
    'x-app': 'claude-code',
    'anthropic-beta': 'prompt-caching-2024-07-31',
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json'
  },
  path: '/v1/messages',
  body: {
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: 'Hello!'
      }
    ],
    metadata: {
      user_id: 'user_d98385411c93cd074b2cefd5c9831fe77f24a53e4ecdcd1f830bba586fe62cb9_account__session_17cf0fd3-d51b-4b59-977d-b899dafb3022'
    }
  }
}

// Test Case 6: System prompt as string (legacy format)
const systemPromptAsStringRequest = {
  headers: {
    'user-agent': 'claude-cli/1.0.69 (darwin, arm64)',
    'x-app': 'claude-code',
    'anthropic-beta': 'prompt-caching-2024-07-31',
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json'
  },
  path: '/v1/messages',
  body: {
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8192,
    system: CLAUDE_CODE_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: 'Hello!'
      }
    ],
    metadata: {
      user_id: 'user_d98385411c93cd074b2cefd5c9831fe77f24a53e4ecdcd1f830bba586fe62cb9_account__session_17cf0fd3-d51b-4b59-977d-b899dafb3022'
    }
  }
}

// Test Case 7: Missing metadata.user_id
const missingUserIdRequest = {
  headers: {
    'user-agent': 'claude-cli/1.0.69 (darwin, arm64)',
    'x-app': 'claude-code',
    'anthropic-beta': 'prompt-caching-2024-07-31',
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json'
  },
  path: '/v1/messages',
  body: {
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8192,
    system: [
      {
        type: 'text',
        text: CLAUDE_CODE_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' }
      }
    ],
    messages: [
      {
        role: 'user',
        content: 'Hello!'
      }
    ]
    // metadata: { user_id: ... } // Missing
  }
}

// Test Case 8: Invalid user_id format
const invalidUserIdRequest = {
  headers: {
    'user-agent': 'claude-cli/1.0.69 (darwin, arm64)',
    'x-app': 'claude-code',
    'anthropic-beta': 'prompt-caching-2024-07-31',
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json'
  },
  path: '/v1/messages',
  body: {
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8192,
    system: [
      {
        type: 'text',
        text: CLAUDE_CODE_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' }
      }
    ],
    messages: [
      {
        role: 'user',
        content: 'Hello!'
      }
    ],
    metadata: {
      user_id: 'invalid_user_id_format' // Invalid format
    }
  }
}

// Helper function to run tests
function runTest(testName, request) {
  console.log('\n' + '='.repeat(80))
  console.log(`TEST: ${testName}`)
  console.log('='.repeat(80))

  // Test the validator (使用 relayService 的严格验证方法)
  const isRealClaudeCode = relayService.isRealClaudeCodeRequest(request)

  console.log('\nRequest Details:')
  console.log('  User-Agent:', request.headers['user-agent'])
  console.log('  Path:', request.path || '(missing)')
  console.log('  x-app header:', request.headers['x-app'] || '(missing)')
  console.log('  anthropic-beta:', request.headers['anthropic-beta'] || '(missing)')
  console.log('  anthropic-version:', request.headers['anthropic-version'] || '(missing)')
  console.log('  System field type:', request.body.system ? (Array.isArray(request.body.system) ? 'array' : typeof request.body.system) : '(missing)')
  console.log('  metadata.user_id:', request.body.metadata?.user_id ? request.body.metadata.user_id.substring(0, 40) + '...' : '(missing)')

  if (request.body.system) {
    if (Array.isArray(request.body.system)) {
      console.log('  System entries:', request.body.system.length)
      request.body.system.forEach((entry, idx) => {
        if (entry.type === 'text') {
          const preview = entry.text.substring(0, 50) + (entry.text.length > 50 ? '...' : '')
          console.log(`    [${idx}] ${preview}`)
        }
      })
    } else if (typeof request.body.system === 'string') {
      const preview = request.body.system.substring(0, 50) + (request.body.system.length > 50 ? '...' : '')
      console.log(`  System content: ${preview}`)
    }
  }

  console.log('\nValidation Result:')
  console.log(`  Is Real Claude Code Request: ${isRealClaudeCode ? '✅ YES' : '❌ NO'}`)
  console.log(`  Expected Behavior: ${isRealClaudeCode ? 'Skip prompt injection' : 'Inject Claude Code system prompt'}`)

  return isRealClaudeCode
}

// Run all tests
console.log('\n')
console.log('╔═══════════════════════════════════════════════════════════════════════════════╗')
console.log('║  CLAUDE CONSOLE RELAY SERVICE - VALIDATION TEST SUITE                         ║')
console.log('╚═══════════════════════════════════════════════════════════════════════════════╝')

const results = []

results.push({
  name: 'Compliant Claude Code Request',
  expected: true,
  actual: runTest('Compliant Claude Code Request (Full Headers + UA + Prompt + user_id)', compliantRequest)
})

results.push({
  name: 'Missing x-app Header',
  expected: false, // 缺少必需 header，应该失败
  actual: runTest('Missing x-app Header', missingHeaderRequest)
})

results.push({
  name: 'Incorrect User-Agent',
  expected: false, // User-Agent 不匹配，应该失败
  actual: runTest('Incorrect User-Agent', incorrectUserAgentRequest)
})

results.push({
  name: 'Missing Claude Code System Prompt',
  expected: false,
  actual: runTest('Missing Claude Code System Prompt', missingSystemPromptRequest)
})

results.push({
  name: 'No System Field',
  expected: false,
  actual: runTest('No System Field', noSystemFieldRequest)
})

results.push({
  name: 'System Prompt as String',
  expected: false, // Validator only accepts array format, not string
  actual: runTest('System Prompt as String (Legacy Format)', systemPromptAsStringRequest)
})

results.push({
  name: 'Missing metadata.user_id',
  expected: false, // 缺少 user_id，应该失败
  actual: runTest('Missing metadata.user_id', missingUserIdRequest)
})

results.push({
  name: 'Invalid user_id Format',
  expected: false, // user_id 格式错误，应该失败
  actual: runTest('Invalid user_id Format', invalidUserIdRequest)
})

// Summary
console.log('\n' + '='.repeat(80))
console.log('TEST SUMMARY')
console.log('='.repeat(80))

let passed = 0
let failed = 0

results.forEach(result => {
  const status = result.actual === result.expected ? '✅ PASS' : '❌ FAIL'
  if (result.actual === result.expected) {
    passed++
  } else {
    failed++
  }
  console.log(`${status} - ${result.name}`)
  if (result.actual !== result.expected) {
    console.log(`       Expected: ${result.expected}, Got: ${result.actual}`)
  }
})

console.log('\n' + '-'.repeat(80))
console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`)
console.log('='.repeat(80))

if (failed > 0) {
  process.exit(1)
}
