import { describe, expect, test } from 'bun:test'
import {
  getProviderApiKey,
  getProviderBaseUrlKey,
  getProviderModelKey,
  PROVIDER_CONFIG_KEYS,
  validateApiKey,
  validateBaseUrl,
} from './helpers.ts'
import type { ProviderConfig } from '../providerConfig.ts'

describe('validateApiKey', () => {
  test('returns null for valid API key', () => {
    expect(validateApiKey('sk-1234567890abcdef', 'OpenAI')).toBeNull()
  })

  test('returns error for undefined API key', () => {
    expect(validateApiKey(undefined, 'OpenAI')).toBe('OpenAI requires an API key')
  })

  test('returns error for placeholder API key', () => {
    expect(validateApiKey('SUA_CHAVE', 'OpenAI')).toBe(
      "OpenAI API key cannot be placeholder value 'SUA_CHAVE'",
    )
  })

  test('returns error for too short API key', () => {
    expect(validateApiKey('short', 'OpenAI')).toBe('OpenAI API key appears invalid (too short)')
  })
})

describe('validateBaseUrl', () => {
  test('returns null for valid URL', () => {
    expect(validateBaseUrl('https://api.openai.com/v1')).toBeNull()
  })

  test('returns null for undefined URL', () => {
    expect(validateBaseUrl(undefined)).toBeNull()
  })

  test('returns error for invalid URL', () => {
    const result = validateBaseUrl('not-a-url')
    expect(result).toContain('Invalid base URL')
  })
})

describe('PROVIDER_CONFIG_KEYS', () => {
  test('has entries for all providers', () => {
    const providers = [
      'anthropic',
      'openai',
      'canopywave',
      'openrouter',
      'grok',
      'gemini',
      'ollama',
    ] as const
    for (const provider of providers) {
      expect(PROVIDER_CONFIG_KEYS[provider]).toBeDefined()
      expect(PROVIDER_CONFIG_KEYS[provider].apiKey).toBeInstanceOf(Array)
      expect(PROVIDER_CONFIG_KEYS[provider].model).toBeInstanceOf(Array)
      expect(PROVIDER_CONFIG_KEYS[provider].baseUrl).toBeDefined()
    }
  })

  test('grok has fallback API keys and models', () => {
    expect(PROVIDER_CONFIG_KEYS.grok.apiKey).toEqual(['grok_api_key', 'xai_api_key'])
    expect(PROVIDER_CONFIG_KEYS.grok.model).toEqual(['grok_model', 'xai_model'])
  })

  test('ollama has empty API key array', () => {
    expect(PROVIDER_CONFIG_KEYS.ollama.apiKey).toEqual([])
  })
})

describe('getProviderModelKey', () => {
  test('returns correct model key for anthropic', () => {
    expect(getProviderModelKey('anthropic')).toBe('anthropic_model')
  })

  test('returns correct model key for openai', () => {
    expect(getProviderModelKey('openai')).toBe('openai_model')
  })

  test('returns correct model key for grok', () => {
    expect(getProviderModelKey('grok')).toBe('grok_model')
  })
})

describe('getProviderApiKey', () => {
  test('returns API key for provider', () => {
    const config: ProviderConfig = {
      openai_api_key: 'sk-test123',
    }
    expect(getProviderApiKey(config, 'openai')).toBe('sk-test123')
  })

  test('returns first available API key for grok', () => {
    const config: ProviderConfig = {
      grok_api_key: 'grok-key',
      xai_api_key: 'xai-key',
    }
    expect(getProviderApiKey(config, 'grok')).toBe('grok-key')
  })

  test('returns fallback API key for grok when primary missing', () => {
    const config: ProviderConfig = {
      xai_api_key: 'xai-key',
    }
    expect(getProviderApiKey(config, 'grok')).toBe('xai-key')
  })

  test('returns undefined when no API key configured', () => {
    const config: ProviderConfig = {}
    expect(getProviderApiKey(config, 'openai')).toBeUndefined()
  })
})

describe('getProviderBaseUrlKey', () => {
  test('returns correct base URL key for anthropic', () => {
    expect(getProviderBaseUrlKey('anthropic')).toBe('anthropic_base_url')
  })

  test('returns correct base URL key for ollama', () => {
    expect(getProviderBaseUrlKey('ollama')).toBe('ollama_base_url')
  })
})
