import type { ProviderConfig } from '../providerConfig.js'
import type { ProviderProfile } from '../providerRegistry.js'

/**
 * Converts a value to a non-empty trimmed string, or undefined if empty.
 */
export function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

/**
 * Provider configuration field mappings for all supported providers.
 * Maps each provider to its API key, model, and base URL config fields.
 * Supports fallback keys (e.g., grok_api_key → xai_api_key).
 */
export const PROVIDER_CONFIG_KEYS: Record<
  ProviderProfile,
  {
    apiKey: Array<keyof ProviderConfig>
    model: Array<keyof ProviderConfig>
    baseUrl: keyof ProviderConfig
  }
> = {
  anthropic: {
    apiKey: ['anthropic_api_key'],
    model: ['anthropic_model'],
    baseUrl: 'anthropic_base_url',
  },
  openai: {
    apiKey: ['openai_api_key'],
    model: ['openai_model'],
    baseUrl: 'openai_base_url',
  },
  canopywave: {
    apiKey: ['canopywave_api_key'],
    model: ['canopywave_model'],
    baseUrl: 'canopywave_base_url',
  },
  openrouter: {
    apiKey: ['openrouter_api_key'],
    model: ['openrouter_model'],
    baseUrl: 'openrouter_base_url',
  },
  grok: {
    apiKey: ['grok_api_key', 'xai_api_key'],
    model: ['grok_model', 'xai_model'],
    baseUrl: 'grok_base_url',
  },
  gemini: {
    apiKey: ['gemini_api_key'],
    model: ['gemini_model'],
    baseUrl: 'gemini_base_url',
  },
  ollama: {
    apiKey: [],
    model: ['ollama_model'],
    baseUrl: 'ollama_base_url',
  },
}

/**
 * Normalizes Ollama base URL by ensuring it ends with /v1.
 */
export function normalizeOllamaOpenAIBaseUrl(baseUrl: string | undefined): string | undefined {
  if (!baseUrl) return undefined
  const trimmed = baseUrl.replace(/\/+$/, '')
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`
}

/**
 * Sets an environment variable if the value is non-empty and overwrite conditions are met.
 */
export function setEnvValue(
  env: NodeJS.ProcessEnv,
  key: string,
  value: string | undefined,
  overwrite: boolean,
): void {
  if (!value) return
  if (!overwrite && env[key]) return
  env[key] = value
}

/**
 * Validates an API key for a provider.
 * @returns Error message if invalid, null if valid
 */
export function validateApiKey(apiKey: string | undefined, providerName: string): string | null {
  if (!apiKey) return `${providerName} requires an API key`
  if (apiKey === 'SUA_CHAVE') return `${providerName} API key cannot be placeholder value 'SUA_CHAVE'`
  if (apiKey.length < 10) return `${providerName} API key appears invalid (too short)`
  return null
}

/**
 * Validates a base URL.
 * @returns Error message if invalid, null if valid or undefined
 */
export function validateBaseUrl(baseUrl: string | undefined): string | null {
  if (!baseUrl) return null
  try {
    new URL(baseUrl)
    return null
  } catch {
    return `Invalid base URL: ${baseUrl}`
  }
}

/**
 * Applies OpenAI-compatible provider configuration to environment variables.
 * Sets both provider-specific vars (e.g., GEMINI_*) and OpenAI compatibility vars.
 */
export function applyOpenAICompatibleProvider(
  env: NodeJS.ProcessEnv,
  prefix: string,
  apiKey: string | undefined,
  model: string,
  baseUrl: string,
  overwrite: boolean,
): void {
  setEnvValue(env, `${prefix}_API_KEY`, apiKey, overwrite)
  setEnvValue(env, `${prefix}_MODEL`, model, overwrite)
  setEnvValue(env, `${prefix}_BASE_URL`, baseUrl, overwrite)

  setEnvValue(env, 'OPENAI_API_KEY', apiKey, overwrite)
  setEnvValue(env, 'OPENAI_MODEL', model, overwrite)
  setEnvValue(env, 'OPENAI_BASE_URL', baseUrl, overwrite)
}

/**
 * Returns the primary model config key for a provider.
 */
export function getProviderModelKey(provider: ProviderProfile): keyof ProviderConfig {
  return PROVIDER_CONFIG_KEYS[provider].model[0]
}

/**
 * Gets the configured model for a provider, checking fallback keys if needed.
 * For example, checks grok_model first, then xai_model for grok provider.
 */
export function getProviderModel(config: ProviderConfig, provider: ProviderProfile): string | undefined {
  const modelKeys = PROVIDER_CONFIG_KEYS[provider].model
  for (const modelKey of modelKeys) {
    const value = asNonEmptyString(config[modelKey])
    if (value) return value
  }
  return undefined
}

/**
 * Gets the configured API key for a provider, checking fallback keys if needed.
 * For example, checks grok_api_key first, then xai_api_key for grok provider.
 */
export function getProviderApiKey(config: ProviderConfig, provider: ProviderProfile): string | undefined {
  const keys = PROVIDER_CONFIG_KEYS[provider].apiKey
  for (const keyField of keys) {
    const value = asNonEmptyString(config[keyField])
    if (value) return value
  }
  return undefined
}

/**
 * Returns the base URL config key for a provider.
 */
export function getProviderBaseUrlKey(provider: ProviderProfile): keyof ProviderConfig {
  return PROVIDER_CONFIG_KEYS[provider].baseUrl
}
