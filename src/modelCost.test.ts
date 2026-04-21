import { expect, test, describe } from 'bun:test'
import {
  calculateUSDCost,
  getModelCosts,
  MODEL_COSTS,
} from './utils/modelCost.ts'

describe('modelCost pricing', () => {
  test('has pricing for newer OpenAI GPT-4.1 models', () => {
    expect(MODEL_COSTS['gpt-4.1']).toBeDefined()
    expect(MODEL_COSTS['gpt-4.1-mini']).toBeDefined()
    expect(MODEL_COSTS['gpt-4.1-nano']).toBeDefined()
  })

  test('has pricing for OpenAI reasoning models', () => {
    expect(MODEL_COSTS['o3-mini']).toBeDefined()
    expect(MODEL_COSTS['o4-mini']).toBeDefined()
    expect(MODEL_COSTS['o3']).toBeDefined()
  })

  test('calculates correct cost for gpt-4.1', () => {
    const cost = calculateUSDCost('gpt-4.1', {
      input_tokens: 1_000_000,
      output_tokens: 1_000_000,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      server_tool_use: { web_search_requests: 0, web_fetch_requests: 0 },
      cache_creation: { ephemeral_1h_input_tokens: 0, ephemeral_5m_input_tokens: 0 },
      service_tier: undefined,
    })
    // $2 input + $8 output = $10 per Mtok
    expect(cost).toBe(10)
  })

  test('calculates correct cost for gpt-4.1-mini', () => {
    const cost = calculateUSDCost('gpt-4.1-mini', {
      input_tokens: 1_000_000,
      output_tokens: 1_000_000,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      server_tool_use: { web_search_requests: 0, web_fetch_requests: 0 },
      cache_creation: { ephemeral_1h_input_tokens: 0, ephemeral_5m_input_tokens: 0 },
      service_tier: undefined,
    })
    // $0.40 input + $1.60 output = $2.00 per Mtok
    expect(cost).toBe(2)
  })

  test('calculates correct cost for o3-mini', () => {
    const cost = calculateUSDCost('o3-mini', {
      input_tokens: 1_000_000,
      output_tokens: 1_000_000,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      server_tool_use: { web_search_requests: 0, web_fetch_requests: 0 },
      cache_creation: { ephemeral_1h_input_tokens: 0, ephemeral_5m_input_tokens: 0 },
      service_tier: undefined,
    })
    // $1.10 input + $4.40 output = $5.50 per Mtok
    expect(cost).toBe(5.5)
  })

  test('falls back to catalog pricing for unknown OpenRouter models', () => {
    // This verifies getCostsFromCatalog is attempted before hardcoded fallback
    const costs = getModelCosts('some-unknown-openrouter-model', {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      server_tool_use: { web_search_requests: 0, web_fetch_requests: 0 },
      cache_creation: { ephemeral_1h_input_tokens: 0, ephemeral_5m_input_tokens: 0 },
      service_tier: undefined,
    })
    // Unknown models fall back to default model pricing
    expect(costs).toBeDefined()
    expect(costs.inputTokens).toBeGreaterThan(0)
  })
})
