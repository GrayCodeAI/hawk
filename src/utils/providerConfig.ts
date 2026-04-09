import {
  DEFAULT_ANTHROPIC_OPENAI_BASE_URL,
  DEFAULT_GEMINI_OPENAI_BASE_URL,
  DEFAULT_GROK_OPENAI_BASE_URL,
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_OPENROUTER_OPENAI_BASE_URL,
} from '@hawk/eyrie'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import {
  getPreferredProviderModel,
  getProviderDefaultModel,
} from './model/configs.js'

export type ProviderProfile =
  | 'anthropic'
  | 'openai'
  | 'openrouter'
  | 'grok'
  | 'gemini'
  | 'ollama'

export type ProviderConfig = {
  active_provider?: ProviderProfile
  anthropic_api_key?: string
  grok_api_key?: string
  xai_api_key?: string
  openai_api_key?: string
  openrouter_api_key?: string
  gemini_api_key?: string
  ollama_base_url?: string
  anthropic_base_url?: string
  grok_base_url?: string
  xai_base_url?: string
  openai_base_url?: string
  openrouter_base_url?: string
  gemini_base_url?: string
  anthropic_model?: string
  openai_model?: string
  grok_model?: string
  xai_model?: string
  openrouter_model?: string
  gemini_model?: string
  ollama_model?: string
  active_model?: string
  exploration_model?: string
  anthropic_version?: string
}

const PROVIDER_PRIORITY: ProviderProfile[] = [
  'anthropic',
  'openai',
  'openrouter',
  'grok',
  'gemini',
  'ollama',
]

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function getHawkConfigHomeDir(): string {
  return (process.env.HAWK_CONFIG_DIR ?? join(homedir(), '.hawk')).normalize('NFC')
}

function normalizeOllamaOpenAIBaseUrl(baseUrl: string | undefined): string | undefined {
  if (!baseUrl) return undefined
  const trimmed = baseUrl.replace(/\/+$/, '')
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`
}

function setIfMissing(env: NodeJS.ProcessEnv, key: string, value: string | undefined): void {
  if (!value || env[key]) return
  env[key] = value
}

export function getProviderConfigPath(): string {
  return join(getHawkConfigHomeDir(), 'provider.json')
}

export function loadProviderConfig(path = getProviderConfigPath()): ProviderConfig | null {
  if (!existsSync(path)) return null
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as ProviderConfig
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function saveProviderConfig(config: ProviderConfig, path = getProviderConfigPath()): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
}

export function isProviderConfigured(config: ProviderConfig, provider: ProviderProfile): boolean {
  switch (provider) {
    case 'anthropic':
      return !!asNonEmptyString(config.anthropic_api_key)
    case 'openai':
      return !!asNonEmptyString(config.openai_api_key)
    case 'openrouter':
      return !!asNonEmptyString(config.openrouter_api_key)
    case 'grok':
      return !!(asNonEmptyString(config.grok_api_key) || asNonEmptyString(config.xai_api_key))
    case 'gemini':
      return !!asNonEmptyString(config.gemini_api_key)
    case 'ollama':
      return !!asNonEmptyString(config.ollama_base_url)
  }
}

export function defaultProviderFromConfig(config: ProviderConfig | null): ProviderProfile | null {
  if (!config) return null
  const explicitProvider = asNonEmptyString(config.active_provider) as ProviderProfile | undefined
  if (explicitProvider && isProviderConfigured(config, explicitProvider)) {
    return explicitProvider
  }
  for (const provider of PROVIDER_PRIORITY) {
    if (isProviderConfigured(config, provider)) return provider
  }
  return null
}

function hasProviderScopedModel(config: ProviderConfig): boolean {
  return !!(
    asNonEmptyString(config.anthropic_model) ||
    asNonEmptyString(config.openai_model) ||
    asNonEmptyString(config.openrouter_model) ||
    asNonEmptyString(config.grok_model) ||
    asNonEmptyString(config.xai_model) ||
    asNonEmptyString(config.gemini_model) ||
    asNonEmptyString(config.ollama_model)
  )
}

export function getProviderActiveModel(
  config: ProviderConfig,
  provider: ProviderProfile,
): string | undefined {
  const providerSpecificModel =
    provider === 'anthropic'
      ? asNonEmptyString(config.anthropic_model)
      : provider === 'openai'
        ? asNonEmptyString(config.openai_model)
      : provider === 'openrouter'
        ? asNonEmptyString(config.openrouter_model)
      : provider === 'grok'
        ? asNonEmptyString(config.grok_model) ?? asNonEmptyString(config.xai_model)
      : provider === 'gemini'
        ? asNonEmptyString(config.gemini_model)
        : asNonEmptyString(config.ollama_model)

  if (providerSpecificModel) return providerSpecificModel
  if (hasProviderScopedModel(config)) return undefined

  const legacyModel = asNonEmptyString(config.active_model)
  if (!legacyModel) return undefined

  // Legacy compatibility: active_model historically represented the default
  // configured provider only, not all providers.
  return defaultProviderFromConfig(config) === provider ? legacyModel : undefined
}

export function applyProviderConfigToEnv(
  env: NodeJS.ProcessEnv = process.env,
  config: ProviderConfig | null = loadProviderConfig(),
): ProviderProfile | null {
  if (!config) {
    return null
  }

  const provider = defaultProviderFromConfig(config)
  if (!provider) return null

  const activeModel = getProviderActiveModel(config, provider)
  const explorationModel = asNonEmptyString(config.exploration_model)
  setIfMissing(env, 'GRAYCODE_SMALL_FAST_MODEL', explorationModel)

  switch (provider) {
    case 'anthropic':
      setIfMissing(env, 'ANTHROPIC_API_KEY', asNonEmptyString(config.anthropic_api_key))
      setIfMissing(env, 'ANTHROPIC_MODEL', activeModel ?? getPreferredProviderModel('anthropic', 'sonnet'))
      setIfMissing(env, 'ANTHROPIC_BASE_URL', asNonEmptyString(config.anthropic_base_url))
      setIfMissing(env, 'ANTHROPIC_VERSION', asNonEmptyString(config.anthropic_version))
      return provider
    case 'openai':
      setIfMissing(env, 'OPENAI_API_KEY', asNonEmptyString(config.openai_api_key))
      setIfMissing(env, 'OPENAI_MODEL', activeModel ?? getProviderDefaultModel('openai'))
      setIfMissing(env, 'OPENAI_BASE_URL', asNonEmptyString(config.openai_base_url) ?? DEFAULT_OPENAI_BASE_URL)
      return provider
    case 'openrouter':
      {
        const openrouterApiKey = asNonEmptyString(config.openrouter_api_key)
        const openrouterBaseUrl =
          asNonEmptyString(config.openrouter_base_url) ??
          DEFAULT_OPENROUTER_OPENAI_BASE_URL
        const openrouterModel =
          activeModel ?? getProviderDefaultModel('openrouter')

        setIfMissing(env, 'OPENROUTER_API_KEY', openrouterApiKey)
        setIfMissing(env, 'OPENROUTER_MODEL', openrouterModel)
        setIfMissing(env, 'OPENROUTER_BASE_URL', openrouterBaseUrl)

        // OpenAI-compatible shim compatibility.
        setIfMissing(env, 'OPENAI_API_KEY', openrouterApiKey)
        setIfMissing(env, 'OPENAI_MODEL', openrouterModel)
        setIfMissing(env, 'OPENAI_BASE_URL', openrouterBaseUrl)
      }
      return provider
    case 'grok':
      {
        const grokApiKey =
          asNonEmptyString(config.grok_api_key) ??
          asNonEmptyString(config.xai_api_key)
        const grokBaseUrl =
          asNonEmptyString(config.grok_base_url) ??
          asNonEmptyString(config.xai_base_url) ??
          DEFAULT_GROK_OPENAI_BASE_URL
        const grokModel = activeModel ?? getProviderDefaultModel('grok')

        setIfMissing(env, 'GROK_API_KEY', asNonEmptyString(config.grok_api_key))
        setIfMissing(env, 'XAI_API_KEY', asNonEmptyString(config.xai_api_key))
        setIfMissing(env, 'GROK_MODEL', grokModel)
        setIfMissing(env, 'GROK_BASE_URL', grokBaseUrl)

        // OpenAI-compatible shim compatibility.
        setIfMissing(env, 'OPENAI_API_KEY', grokApiKey)
        setIfMissing(env, 'OPENAI_MODEL', grokModel)
        setIfMissing(env, 'OPENAI_BASE_URL', grokBaseUrl)
      }
      return provider
    case 'gemini':
      {
        const geminiApiKey = asNonEmptyString(config.gemini_api_key)
        const geminiBaseUrl =
          asNonEmptyString(config.gemini_base_url) ??
          DEFAULT_GEMINI_OPENAI_BASE_URL
        const geminiModel =
          activeModel ?? getProviderDefaultModel('gemini')

        setIfMissing(env, 'GEMINI_API_KEY', asNonEmptyString(config.gemini_api_key))
        setIfMissing(env, 'GEMINI_MODEL', geminiModel)
        setIfMissing(env, 'GEMINI_BASE_URL', geminiBaseUrl)

        // OpenAI-compatible shim compatibility.
        setIfMissing(env, 'OPENAI_API_KEY', geminiApiKey)
        setIfMissing(env, 'OPENAI_MODEL', geminiModel)
        setIfMissing(env, 'OPENAI_BASE_URL', geminiBaseUrl)
      }
      return provider
    case 'ollama':
      setIfMissing(env, 'OPENAI_MODEL', activeModel ?? 'llama3.1:8b')
      setIfMissing(env, 'OPENAI_BASE_URL', normalizeOllamaOpenAIBaseUrl(asNonEmptyString(config.ollama_base_url)) ?? 'http://localhost:11434/v1')
      return provider
  }
}
