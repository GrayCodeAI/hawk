import {
  isLocalProviderUrl,
  resolveOpenAICompatibleRuntime,
  type ResolvedOpenAICompatibleRuntime,
} from '@hawk/eyrie'
import {
  applyProviderConfigToEnv,
  defaultProviderFromConfig,
  getProviderConfigPath,
  loadProviderConfig,
  saveProviderConfig,
  type ProviderConfig,
} from '../src/utils/providerConfig.js'
import {
  PROVIDER_DEFAULT_BASE_URLS,
  PROVIDER_DEFAULT_MODELS,
  PROVIDER_PROFILES,
  type ProviderProfile,
} from '../src/utils/providerRegistry.js'

export type ProfileEnv = {
  OPENAI_BASE_URL?: string
  CANOPYWAVE_BASE_URL?: string
  OPENROUTER_BASE_URL?: string
  OPENAI_MODEL?: string
  CANOPYWAVE_MODEL?: string
  OPENROUTER_MODEL?: string
  OPENAI_API_KEY?: string
  CANOPYWAVE_API_KEY?: string
  OPENROUTER_API_KEY?: string
  OPENAI_API_BASE?: string
  GEMINI_API_KEY?: string
  GEMINI_MODEL?: string
  GEMINI_BASE_URL?: string
  ANTHROPIC_API_KEY?: string
  ANTHROPIC_MODEL?: string
  ANTHROPIC_BASE_URL?: string
  ANTHROPIC_VERSION?: string
  GROK_API_KEY?: string
  GROK_MODEL?: string
  GROK_BASE_URL?: string
  XAI_API_KEY?: string
  XAI_MODEL?: string
  XAI_BASE_URL?: string
}

export type ProfileFile = {
  profile: ProviderProfile
  env?: ProfileEnv
}

export type ProfileInitOptions = {
  model?: string | null
  baseUrl?: string | null
  apiKey?: string | null
  anthropicVersion?: string | null
}

type ProfileDefinition = {
  defaultModel: string
  defaultBaseUrl: string
  modelEnv: keyof ProfileEnv
  baseUrlEnv: keyof ProfileEnv
  keyEnv?: keyof ProfileEnv
  keyFallbackEnv: Array<keyof ProfileEnv>
  useFlag?: string
}

export const PROFILE_DEFINITIONS: Record<ProviderProfile, ProfileDefinition> = {
  anthropic: {
    defaultModel: PROVIDER_DEFAULT_MODELS.anthropic,
    defaultBaseUrl: PROVIDER_DEFAULT_BASE_URLS.anthropic,
    modelEnv: 'ANTHROPIC_MODEL',
    baseUrlEnv: 'ANTHROPIC_BASE_URL',
    keyEnv: 'ANTHROPIC_API_KEY',
    keyFallbackEnv: ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'],
    useFlag: 'HAWK_CODE_USE_ANTHROPIC',
  },
  grok: {
    defaultModel: PROVIDER_DEFAULT_MODELS.grok,
    defaultBaseUrl: PROVIDER_DEFAULT_BASE_URLS.grok,
    modelEnv: 'GROK_MODEL',
    baseUrlEnv: 'GROK_BASE_URL',
    keyEnv: 'GROK_API_KEY',
    keyFallbackEnv: ['GROK_API_KEY', 'XAI_API_KEY', 'OPENAI_API_KEY'],
    useFlag: 'HAWK_CODE_USE_GROK',
  },
  openai: {
    defaultModel: PROVIDER_DEFAULT_MODELS.openai,
    defaultBaseUrl: PROVIDER_DEFAULT_BASE_URLS.openai,
    modelEnv: 'OPENAI_MODEL',
    baseUrlEnv: 'OPENAI_BASE_URL',
    keyEnv: 'OPENAI_API_KEY',
    keyFallbackEnv: ['OPENAI_API_KEY'],
    useFlag: 'HAWK_CODE_USE_OPENAI',
  },
  canopywave: {
    defaultModel: PROVIDER_DEFAULT_MODELS.canopywave,
    defaultBaseUrl: PROVIDER_DEFAULT_BASE_URLS.canopywave,
    modelEnv: 'CANOPYWAVE_MODEL',
    baseUrlEnv: 'CANOPYWAVE_BASE_URL',
    keyEnv: 'CANOPYWAVE_API_KEY',
    keyFallbackEnv: ['CANOPYWAVE_API_KEY', 'OPENAI_API_KEY'],
    useFlag: 'HAWK_CODE_USE_OPENAI',
  },
  openrouter: {
    defaultModel: PROVIDER_DEFAULT_MODELS.openrouter,
    defaultBaseUrl: PROVIDER_DEFAULT_BASE_URLS.openrouter,
    modelEnv: 'OPENROUTER_MODEL',
    baseUrlEnv: 'OPENROUTER_BASE_URL',
    keyEnv: 'OPENROUTER_API_KEY',
    keyFallbackEnv: ['OPENROUTER_API_KEY'],
    useFlag: 'HAWK_CODE_USE_OPENAI',
  },
  gemini: {
    defaultModel: PROVIDER_DEFAULT_MODELS.gemini,
    defaultBaseUrl: PROVIDER_DEFAULT_BASE_URLS.gemini,
    modelEnv: 'GEMINI_MODEL',
    baseUrlEnv: 'GEMINI_BASE_URL',
    keyEnv: 'GEMINI_API_KEY',
    keyFallbackEnv: ['GEMINI_API_KEY', 'OPENAI_API_KEY'],
    useFlag: 'HAWK_CODE_USE_GEMINI',
  },
  ollama: {
    defaultModel: PROVIDER_DEFAULT_MODELS.ollama,
    defaultBaseUrl: 'http://localhost:11434/v1',
    modelEnv: 'OPENAI_MODEL',
    baseUrlEnv: 'OPENAI_BASE_URL',
    keyEnv: 'OPENAI_API_KEY',
    keyFallbackEnv: ['OPENAI_API_KEY'],
  },
}

export const PROFILE_CHOICES: ProviderProfile[] = [...PROVIDER_PROFILES]

function toProfileEnv(env: NodeJS.ProcessEnv): ProfileEnv {
  const keys: Array<keyof ProfileEnv> = [
    'OPENAI_BASE_URL',
    'CANOPYWAVE_BASE_URL',
    'OPENROUTER_BASE_URL',
    'OPENAI_MODEL',
    'CANOPYWAVE_MODEL',
    'OPENROUTER_MODEL',
    'OPENAI_API_KEY',
    'CANOPYWAVE_API_KEY',
    'OPENROUTER_API_KEY',
    'OPENAI_API_BASE',
    'GEMINI_API_KEY',
    'GEMINI_MODEL',
    'GEMINI_BASE_URL',
    'ANTHROPIC_API_KEY',
    'ANTHROPIC_MODEL',
    'ANTHROPIC_BASE_URL',
    'ANTHROPIC_VERSION',
    'GROK_API_KEY',
    'GROK_MODEL',
    'GROK_BASE_URL',
    'XAI_API_KEY',
    'XAI_MODEL',
    'XAI_BASE_URL',
  ]
  const profileEnv: ProfileEnv = {}
  for (const key of keys) {
    const value = env[key]
    if (typeof value === 'string' && value.trim()) {
      profileEnv[key] = value.trim()
    }
  }
  return profileEnv
}

export function loadProviderProfileConfig(): ProfileFile | null {
  const config = loadProviderConfig()
  const profile = defaultProviderFromConfig(config) as ProviderProfile | null
  if (!config || !profile) return null
  const env: NodeJS.ProcessEnv = {}
  applyProviderConfigToEnv(env, config)
  return {
    profile,
    env: toProfileEnv(env),
  }
}

export function saveProviderProfileConfig(
  profile: ProviderProfile,
  env: ProfileEnv,
): string {
  const config: ProviderConfig = loadProviderConfig() ?? {}
  const model = env[PROFILE_DEFINITIONS[profile].modelEnv]

  if (model) config.active_model = model

  switch (profile) {
    case 'anthropic':
      config.anthropic_api_key = env.ANTHROPIC_API_KEY
      config.anthropic_base_url = env.ANTHROPIC_BASE_URL
      config.anthropic_version = env.ANTHROPIC_VERSION
      break
    case 'grok':
      config.grok_api_key = env.GROK_API_KEY
      config.xai_api_key = env.XAI_API_KEY
      config.grok_base_url = env.GROK_BASE_URL
      config.xai_base_url = env.XAI_BASE_URL
      break
    case 'openai':
      config.openai_api_key = env.OPENAI_API_KEY
      config.openai_base_url = env.OPENAI_BASE_URL
      config.openai_model = env.OPENAI_MODEL
      break
    case 'canopywave':
      config.canopywave_api_key = env.CANOPYWAVE_API_KEY
      config.canopywave_base_url = env.CANOPYWAVE_BASE_URL
      config.canopywave_model = env.CANOPYWAVE_MODEL
      break
    case 'openrouter':
      config.openrouter_api_key = env.OPENROUTER_API_KEY
      config.openrouter_base_url = env.OPENROUTER_BASE_URL
      config.openrouter_model = env.OPENROUTER_MODEL
      break
    case 'gemini':
      config.gemini_api_key = env.GEMINI_API_KEY
      config.gemini_base_url = env.GEMINI_BASE_URL
      break
    case 'ollama':
      config.ollama_base_url = env.OPENAI_BASE_URL?.replace(/\/v1\/?$/, '')
      break
  }

  saveProviderConfig(config)
  return getProviderConfigPath()
}

export function isProviderProfile(value: string | undefined): value is ProviderProfile {
  return !!value && PROFILE_CHOICES.includes(value as ProviderProfile)
}

export async function hasLocalOllama(): Promise<boolean> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 1200)

  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      signal: controller.signal,
    })
    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

export function sanitizeApiKey(key: string | null | undefined): string | undefined {
  if (!key || key === 'SUA_CHAVE') return undefined
  return key
}

function firstValue(
  env: NodeJS.ProcessEnv | ProfileEnv,
  keys: Array<keyof ProfileEnv>,
): string | undefined {
  for (const key of keys) {
    const value = env[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

function setOpenAICompatMirror(env: ProfileEnv, definition: ProfileDefinition): void {
  env.OPENAI_MODEL = env[definition.modelEnv]
  env.OPENAI_BASE_URL = env[definition.baseUrlEnv]
  if (definition.keyEnv && env[definition.keyEnv]) {
    env.OPENAI_API_KEY = env[definition.keyEnv]
  }
}

function clearProviderFlags(env: NodeJS.ProcessEnv): void {
  delete env.HAWK_CODE_USE_GEMINI
  delete env.HAWK_CODE_USE_GROK
  delete env.HAWK_CODE_USE_ANTHROPIC
}

export function createProfileEnv(
  profile: ProviderProfile,
  options: ProfileInitOptions = {},
  sourceEnv: NodeJS.ProcessEnv = process.env,
): ProfileEnv {
  const definition = PROFILE_DEFINITIONS[profile]
  const env: ProfileEnv = {}
  env[definition.modelEnv] =
    options.model ||
    firstValue(sourceEnv, [definition.modelEnv, 'OPENAI_MODEL']) ||
    definition.defaultModel
  env[definition.baseUrlEnv] =
    options.baseUrl ||
    firstValue(sourceEnv, [definition.baseUrlEnv, 'OPENAI_BASE_URL']) ||
    definition.defaultBaseUrl

  const key = sanitizeApiKey(
    options.apiKey || firstValue(sourceEnv, definition.keyFallbackEnv),
  )
  if (key && definition.keyEnv) {
    env[definition.keyEnv] = key
  }

  if (profile !== 'ollama') {
    setOpenAICompatMirror(env, definition)
  }

  if (profile === 'anthropic') {
    const anthropicVersion =
      options.anthropicVersion || sourceEnv.ANTHROPIC_VERSION
    if (anthropicVersion) env.ANTHROPIC_VERSION = anthropicVersion
  }

  return env
}

export function buildLaunchEnv(
  profile: ProviderProfile,
  persisted: ProfileFile | null,
  sourceEnv: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const definition = PROFILE_DEFINITIONS[profile]
  const persistedEnv = persisted?.env ?? {}
  const env: NodeJS.ProcessEnv = {
    ...sourceEnv,
    HAWK_CODE_USE_OPENAI: '1',
  }
  clearProviderFlags(env)

  if (definition.useFlag && definition.useFlag !== 'HAWK_CODE_USE_OPENAI') {
    env[definition.useFlag] = '1'
  }

  env[definition.modelEnv] =
    sourceEnv[definition.modelEnv] ||
    persistedEnv[definition.modelEnv] ||
    sourceEnv.OPENAI_MODEL ||
    definition.defaultModel
  env[definition.baseUrlEnv] =
    sourceEnv[definition.baseUrlEnv] ||
    persistedEnv[definition.baseUrlEnv] ||
    sourceEnv.OPENAI_BASE_URL ||
    definition.defaultBaseUrl

  const key = firstValue(sourceEnv, definition.keyFallbackEnv)
    ?? firstValue(persistedEnv, definition.keyFallbackEnv)
  if (key && definition.keyEnv) {
    env[definition.keyEnv] = key
  }

  if (profile !== 'ollama') {
    env.OPENAI_MODEL = env[definition.modelEnv]
    env.OPENAI_BASE_URL = env[definition.baseUrlEnv]
    if (definition.keyEnv && env[definition.keyEnv] && !sourceEnv.OPENAI_API_KEY) {
      env.OPENAI_API_KEY = env[definition.keyEnv]
    }
  }

  if (profile === 'ollama' && (!sourceEnv.OPENAI_API_KEY || sourceEnv.OPENAI_API_KEY === 'SUA_CHAVE')) {
    delete env.OPENAI_API_KEY
  }

  if (profile === 'anthropic' && (sourceEnv.ANTHROPIC_VERSION || persistedEnv.ANTHROPIC_VERSION)) {
    env.ANTHROPIC_VERSION = sourceEnv.ANTHROPIC_VERSION || persistedEnv.ANTHROPIC_VERSION
  }

  return env
}

export function resolveProfileRuntime(env: NodeJS.ProcessEnv): ResolvedOpenAICompatibleRuntime {
  return resolveOpenAICompatibleRuntime({ env })
}

export function validateProfileRuntime(
  profile: ProviderProfile,
  runtime: ResolvedOpenAICompatibleRuntime,
): string | null {
  const keyLabel = profileKeyLabel(profile)
  if (profile !== 'ollama' && runtime.apiKey === 'SUA_CHAVE') {
    return `${keyLabel} is required for ${profile} profile and cannot be SUA_CHAVE. Run: bun run profile:init -- --provider ${profile} --api-key <key>`
  }
  if (
    profile !== 'ollama' &&
    !runtime.apiKey &&
    !isLocalProviderUrl(runtime.request.baseUrl)
  ) {
    return `${keyLabel} is required for ${profile} profile. Run: bun run profile:init -- --provider ${profile} --api-key <key>`
  }
  return null
}

export function profileKeyLabel(profile: ProviderProfile): string {
  if (profile === 'anthropic') return 'ANTHROPIC_API_KEY'
  if (profile === 'grok') return 'GROK_API_KEY (or XAI_API_KEY)'
  if (profile === 'gemini') return 'GEMINI_API_KEY'
  if (profile === 'canopywave') return 'CANOPYWAVE_API_KEY'
  return 'OPENAI_API_KEY'
}
