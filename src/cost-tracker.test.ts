import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  addToTotalSessionCost,
  resetCostState,
  getModelUsage,
  resetStateForTests,
} from './cost-tracker.ts'

describe('cost-tracker token counting', () => {
  beforeEach(() => {
    if (process.env.NODE_ENV === 'test') {
      resetStateForTests()
    }
  })

  afterEach(() => {
    if (process.env.NODE_ENV === 'test') {
      resetStateForTests()
    }
  })

  test('delta-tracks input tokens for providers without cache (OpenAI-compatible)', () => {
    const model = 'gpt-4o'

    // First turn: 1000 input tokens (no cache reported)
    addToTotalSessionCost(0, {
      input_tokens: 1000,
      output_tokens: 100,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      server_tool_use: { web_search_requests: 0, web_fetch_requests: 0 },
      cache_creation: { ephemeral_1h_input_tokens: 0, ephemeral_5m_input_tokens: 0 },
      service_tier: undefined,
    }, model)

    let usage = getModelUsage()[model]
    expect(usage?.inputTokens).toBe(1000)

    // Second turn: 1500 cumulative input tokens → delta should be 500
    addToTotalSessionCost(0, {
      input_tokens: 1500,
      output_tokens: 100,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      server_tool_use: { web_search_requests: 0, web_fetch_requests: 0 },
      cache_creation: { ephemeral_1h_input_tokens: 0, ephemeral_5m_input_tokens: 0 },
      service_tier: undefined,
    }, model)

    usage = getModelUsage()[model]
    expect(usage?.inputTokens).toBe(1500) // 1000 + 500
  })

  test('resets token tracking when resetCostState is called', () => {
    const model = 'gpt-4o'

    // First turn: 1000 input tokens
    addToTotalSessionCost(0, {
      input_tokens: 1000,
      output_tokens: 100,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      server_tool_use: { web_search_requests: 0, web_fetch_requests: 0 },
      cache_creation: { ephemeral_1h_input_tokens: 0, ephemeral_5m_input_tokens: 0 },
      service_tier: undefined,
    }, model)

    // Reset session
    resetCostState()

    // After reset, the next call should count the FULL amount, not delta
    addToTotalSessionCost(0, {
      input_tokens: 2000,
      output_tokens: 100,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      server_tool_use: { web_search_requests: 0, web_fetch_requests: 0 },
      cache_creation: { ephemeral_1h_input_tokens: 0, ephemeral_5m_input_tokens: 0 },
      service_tier: undefined,
    }, model)

    const usage = getModelUsage()[model]
    // If tracking was NOT reset, this would be 1000 (delta = 2000 - 1000).
    // With the fix, it should be 2000 (full amount because lastInputTokens was cleared).
    expect(usage?.inputTokens).toBe(2000)
  })

  test('subtracts cache tokens for providers that report them (Anthropic)', () => {
    const model = 'claude-sonnet-4-6'

    // Anthropic reports input_tokens INCLUDING cache
    addToTotalSessionCost(0, {
      input_tokens: 1200, // includes 200 cache read
      output_tokens: 100,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 200,
      server_tool_use: { web_search_requests: 0, web_fetch_requests: 0 },
      cache_creation: { ephemeral_1h_input_tokens: 0, ephemeral_5m_input_tokens: 0 },
      service_tier: undefined,
    }, model)

    const usage = getModelUsage()[model]
    // inputTokens should be 1200 - 200 = 1000
    expect(usage?.inputTokens).toBe(1000)
    expect(usage?.cacheReadInputTokens).toBe(200)
  })
})
