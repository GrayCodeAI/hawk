import {
  DEFAULT_ANTHROPIC_OPENAI_BASE_URL,
  DEFAULT_CANOPYWAVE_OPENAI_BASE_URL,
  DEFAULT_GEMINI_OPENAI_BASE_URL,
  DEFAULT_GROK_OPENAI_BASE_URL,
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_OPENROUTER_OPENAI_BASE_URL,
  OPENCODEGO_DEFAULT_BASE_URL,
  OPENAI_COMPATIBLE_RUNTIME_PROFILES,
  OLLAMA_DEFAULT_MODEL,
  OPENCODEGO_DEFAULT_MODEL,
} from '@hawk/eyrie'

export const PROVIDER_PROFILES = [
  'anthropic',
  'openai',
  'gemini',
  'grok',
  'openrouter',
  'canopywave',
  'opencodego',
  'ollama',
] as const

export type ProviderProfile = (typeof PROVIDER_PROFILES)[number]

export const PROVIDER_PRIORITY: ProviderProfile[] = [...PROVIDER_PROFILES]

export const PROVIDER_LABELS: Record<ProviderProfile, string> = {
  anthropic: 'Anthropic',
  canopywave: 'CanopyWave',
  openai: 'OpenAI',
  openrouter: 'OpenRouter',
  grok: 'Grok / xAI',
  gemini: 'Gemini',
  opencodego: 'OpenCodeGO',
  ollama: 'Ollama',
}

export const PROVIDER_DEFAULT_BASE_URLS: Record<ProviderProfile, string> = {
  anthropic: DEFAULT_ANTHROPIC_OPENAI_BASE_URL,
  canopywave: DEFAULT_CANOPYWAVE_OPENAI_BASE_URL,
  openai: DEFAULT_OPENAI_BASE_URL,
  openrouter: DEFAULT_OPENROUTER_OPENAI_BASE_URL,
  grok: DEFAULT_GROK_OPENAI_BASE_URL,
  gemini: DEFAULT_GEMINI_OPENAI_BASE_URL,
  opencodego: OPENCODEGO_DEFAULT_BASE_URL,
  ollama: 'http://localhost:11434',
}

export const PROVIDER_DEFAULT_MODELS: Record<ProviderProfile, string> = {
  anthropic: OPENAI_COMPATIBLE_RUNTIME_PROFILES.anthropic.defaultModel,
  canopywave: OPENAI_COMPATIBLE_RUNTIME_PROFILES.canopywave.defaultModel,
  openai: OPENAI_COMPATIBLE_RUNTIME_PROFILES.openai.defaultModel,
  openrouter: OPENAI_COMPATIBLE_RUNTIME_PROFILES.openrouter.defaultModel,
  grok: OPENAI_COMPATIBLE_RUNTIME_PROFILES.grok.defaultModel,
  gemini: OPENAI_COMPATIBLE_RUNTIME_PROFILES.gemini.defaultModel,
  opencodego: OPENCODEGO_DEFAULT_MODEL,
  ollama: OLLAMA_DEFAULT_MODEL,
}
