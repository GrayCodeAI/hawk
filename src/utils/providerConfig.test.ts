import { describe, expect, test } from 'bun:test'
import {
  getProviderActiveModel,
  isProviderConfigured,
  type ProviderConfig,
} from './providerConfig.ts'

describe('isProviderConfigured', () => {
  test('returns true when anthropic API key is configured', () => {
    const config: ProviderConfig = {
      anthropic_api_key: 'sk-ant-test',
    }
    expect(isProviderConfigured(config, 'anthropic')).toBe(true)
  })

  test('returns false when anthropic API key is missing', () => {
    const config: ProviderConfig = {}
    expect(isProviderConfigured(config, 'anthropic')).toBe(false)
  })

  test('returns true when grok_api_key is configured', () => {
    const config: ProviderConfig = {
      grok_api_key: 'grok-test',
    }
    expect(isProviderConfigured(config, 'grok')).toBe(true)
  })

  test('returns true when xai_api_key is configured (grok fallback)', () => {
    const config: ProviderConfig = {
      xai_api_key: 'xai-test',
    }
    expect(isProviderConfigured(config, 'grok')).toBe(true)
  })

  test('returns true when ollama base URL is configured', () => {
    const config: ProviderConfig = {
      ollama_base_url: 'http://localhost:11434',
    }
    expect(isProviderConfigured(config, 'ollama')).toBe(true)
  })

  test('returns false when ollama base URL is missing', () => {
    const config: ProviderConfig = {}
    expect(isProviderConfigured(config, 'ollama')).toBe(false)
  })

  test('returns true for all providers with valid config', () => {
    const config: ProviderConfig = {
      anthropic_api_key: 'sk-ant-test',
      openai_api_key: 'sk-test',
      canopywave_api_key: 'cw-test',
      openrouter_api_key: 'or-test',
      grok_api_key: 'grok-test',
      gemini_api_key: 'gem-test',
      ollama_base_url: 'http://localhost:11434',
    }
    expect(isProviderConfigured(config, 'anthropic')).toBe(true)
    expect(isProviderConfigured(config, 'openai')).toBe(true)
    expect(isProviderConfigured(config, 'canopywave')).toBe(true)
    expect(isProviderConfigured(config, 'openrouter')).toBe(true)
    expect(isProviderConfigured(config, 'grok')).toBe(true)
    expect(isProviderConfigured(config, 'gemini')).toBe(true)
    expect(isProviderConfigured(config, 'ollama')).toBe(true)
  })
})

describe('getProviderActiveModel', () => {
  test('returns provider-specific model when configured', () => {
    const config: ProviderConfig = {
      anthropic_model: 'claude-opus-4-6',
    }
    expect(getProviderActiveModel(config, 'anthropic')).toBe('claude-opus-4-6')
  })

  test('returns undefined when provider model not configured but others are', () => {
    const config: ProviderConfig = {
      openai_model: 'gpt-4o',
    }
    expect(getProviderActiveModel(config, 'anthropic')).toBeUndefined()
  })

  test('returns legacy active_model when no provider-specific models exist', () => {
    const config: ProviderConfig = {
      active_model: 'claude-sonnet-4-6',
      anthropic_api_key: 'sk-ant-test',
    }
    expect(getProviderActiveModel(config, 'anthropic')).toBe('claude-sonnet-4-6')
  })

  test('returns undefined for non-default provider when using legacy active_model', () => {
    const config: ProviderConfig = {
      active_model: 'claude-sonnet-4-6',
      openai_api_key: 'sk-test',
    }
    expect(getProviderActiveModel(config, 'anthropic')).toBeUndefined()
  })

  test('prefers grok_model over xai_model', () => {
    const config: ProviderConfig = {
      grok_model: 'grok-2',
      xai_model: 'grok-1',
    }
    expect(getProviderActiveModel(config, 'grok')).toBe('grok-2')
  })

  test('falls back to xai_model when grok_model not set', () => {
    const config: ProviderConfig = {
      xai_model: 'grok-1',
    }
    expect(getProviderActiveModel(config, 'grok')).toBe('grok-1')
  })

  test('returns undefined when no model configured', () => {
    const config: ProviderConfig = {}
    expect(getProviderActiveModel(config, 'anthropic')).toBeUndefined()
  })
})
