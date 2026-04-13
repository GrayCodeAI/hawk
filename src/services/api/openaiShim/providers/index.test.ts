import { expect, test } from 'bun:test'
import { buildRuntimeRequest } from './index.ts'

test('buildRuntimeRequest sets anthropic compatibility headers', () => {
  const runtime = {
    mode: 'anthropic',
    request: {
      baseUrl: 'https://api.anthropic.com/v1',
      resolvedModel: 'claude-sonnet-4',
      requestedModel: 'claude-sonnet-4',
      transport: 'chat_completions',
    },
    apiKey: 'anthropic-key',
    apiKeySource: 'anthropic',
  } as const

  const result = buildRuntimeRequest(runtime, {}, {})

  expect(result.url).toBe('https://api.anthropic.com/v1/chat/completions')
  expect(result.headers.Authorization).toBe('Bearer anthropic-key')
  expect(result.headers['x-api-key']).toBe('anthropic-key')
  expect(result.headers['anthropic-version']).toBeTruthy()
})

test('buildRuntimeRequest sets bearer auth for openai-compatible runtime modes', () => {
  const runtime = {
    mode: 'openrouter',
    request: {
      baseUrl: 'https://openrouter.ai/api/v1',
      resolvedModel: 'openai/gpt-4o-mini',
      requestedModel: 'openai/gpt-4o-mini',
      transport: 'chat_completions',
    },
    apiKey: 'openrouter-key',
    apiKeySource: 'openrouter',
  } as const

  const result = buildRuntimeRequest(runtime, { 'x-test': '1' }, {})

  expect(result.url).toBe('https://openrouter.ai/api/v1/chat/completions')
  expect(result.headers.Authorization).toBe('Bearer openrouter-key')
  expect(result.headers['x-api-key']).toBeUndefined()
  expect(result.headers['x-test']).toBe('1')
})
