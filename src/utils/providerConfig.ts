import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import {
  PROVIDER_PRIORITY,
  type ProviderProfile,
} from './providerRegistry.js'
import { asNonEmptyString, setEnvValue } from './providerConfig/helpers.js'
import { applyProviderEnv } from './providerConfig/providers/index.js'

export type { ProviderProfile } from './providerRegistry.js'

export type ProviderConfig = {
  active_provider?: ProviderProfile
  anthropic_api_key?: string
  grok_api_key?: string
  xai_api_key?: string
  openai_api_key?: string
  canopywave_api_key?: string
  openrouter_api_key?: string
  gemini_api_key?: string
  ollama_base_url?: string
  anthropic_base_url?: string
  canopywave_base_url?: string
  grok_base_url?: string
  xai_base_url?: string
  openai_base_url?: string
  openrouter_base_url?: string
  gemini_base_url?: string
  anthropic_model?: string
  openai_model?: string
  canopywave_model?: string
  grok_model?: string
  xai_model?: string
  openrouter_model?: string
  gemini_model?: string
  ollama_model?: string
  active_model?: string
  exploration_model?: string
  anthropic_version?: string
}

function getHawkConfigHomeDir(): string {
  return (process.env.HAWK_CONFIG_DIR ?? join(homedir(), '.hawk')).normalize('NFC')
}

function clearProviderRuntimeEnv(env: NodeJS.ProcessEnv): void {
  const keys = [
    'ANTHROPIC_API_KEY',
    'ANTHROPIC_MODEL',
    'ANTHROPIC_BASE_URL',
    'ANTHROPIC_VERSION',
    'OPENAI_API_KEY',
    'OPENAI_MODEL',
    'OPENAI_BASE_URL',
    'OPENROUTER_API_KEY',
    'OPENROUTER_MODEL',
    'OPENROUTER_BASE_URL',
    'CANOPYWAVE_API_KEY',
    'CANOPYWAVE_MODEL',
    'CANOPYWAVE_BASE_URL',
    'GROK_API_KEY',
    'GROK_MODEL',
    'GROK_BASE_URL',
    'XAI_API_KEY',
    'XAI_MODEL',
    'XAI_BASE_URL',
    'GEMINI_API_KEY',
    'GEMINI_MODEL',
    'GEMINI_BASE_URL',
    'OLLAMA_BASE_URL',
  ] as const
  for (const key of keys) {
    delete env[key]
  }
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
    case 'canopywave':
      return !!asNonEmptyString(config.canopywave_api_key)
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
    asNonEmptyString(config.canopywave_model) ||
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
      : provider === 'canopywave'
        ? asNonEmptyString(config.canopywave_model)
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
  options?: {
    overwrite?: boolean
  },
): ProviderProfile | null {
  if (!config) {
    return null
  }

  const provider = defaultProviderFromConfig(config)
  if (!provider) return null
  const overwrite = options?.overwrite === true
  if (overwrite) {
    clearProviderRuntimeEnv(env)
  }

  const activeModel = getProviderActiveModel(config, provider)
  const explorationModel = asNonEmptyString(config.exploration_model)
  setEnvValue(env, 'GRAYCODE_SMALL_FAST_MODEL', explorationModel, overwrite)

  applyProviderEnv(provider, {
    env,
    config,
    activeModel,
    overwrite,
  })

  return provider
}
