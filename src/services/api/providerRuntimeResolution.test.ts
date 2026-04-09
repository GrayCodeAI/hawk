import { afterEach, expect, test } from 'bun:test'
import { resolveOpenAICompatibleRuntime } from '@hawk/eyrie'
import {
  applyProviderConfigToEnv,
  type ProviderConfig,
} from '../../utils/providerConfig.ts'

const ENV_KEYS = [
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
  'OPENAI_BASE_URL',
  'OPENROUTER_API_KEY',
  'OPENROUTER_MODEL',
  'OPENROUTER_BASE_URL',
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'GEMINI_BASE_URL',
] as const

const originalEnv = Object.fromEntries(
  ENV_KEYS.map(key => [key, process.env[key]]),
) as Record<(typeof ENV_KEYS)[number], string | undefined>

afterEach(() => {
  for (const key of ENV_KEYS) {
    process.env[key] = originalEnv[key]
  }
})

test('OpenRouter selected profile wins even when OPENAI_API_KEY already exists', () => {
  const config: ProviderConfig = {
    active_provider: 'openrouter',
    openrouter_api_key: 'or-key',
    openrouter_model: 'openai/gpt-4o-mini',
    openrouter_base_url: 'https://openrouter.ai/api/v1',
  }

  const env: NodeJS.ProcessEnv = {
    OPENAI_API_KEY: 'stale-openai-key',
  }

  applyProviderConfigToEnv(env, config)
  const runtime = resolveOpenAICompatibleRuntime({ env })

  expect(env.OPENROUTER_API_KEY).toBe('or-key')
  expect(runtime.mode).toBe('openrouter')
  expect(runtime.apiKey).toBe('or-key')
  expect(runtime.request.resolvedModel).toBe('openai/gpt-4o-mini')
})

test('Gemini selected profile resolves Gemini runtime mode and key', () => {
  const config: ProviderConfig = {
    active_provider: 'gemini',
    gemini_api_key: 'gem-key',
    gemini_model: 'gemini-2.5-pro',
    gemini_base_url: 'https://generativelanguage.googleapis.com/v1beta/openai',
  }

  const env: NodeJS.ProcessEnv = {}
  applyProviderConfigToEnv(env, config)
  const runtime = resolveOpenAICompatibleRuntime({ env })

  expect(runtime.mode).toBe('gemini')
  expect(runtime.apiKey).toBe('gem-key')
  expect(runtime.request.resolvedModel).toBe('gemini-2.5-pro')
})
