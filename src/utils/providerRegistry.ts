import {
  DEFAULT_ANTHROPIC_OPENAI_BASE_URL,
  DEFAULT_GEMINI_OPENAI_BASE_URL,
  DEFAULT_GROK_OPENAI_BASE_URL,
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_OPENROUTER_OPENAI_BASE_URL,
} from '@hawk/eyrie'

export const CANOPYWAVE_OPENAI_BASE_URL = 'https://inference.canopywave.io/v1'

export const PROVIDER_PROFILES = [
  'anthropic',
  'canopywave',
  'openai',
  'openrouter',
  'grok',
  'gemini',
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
  ollama: 'Ollama',
}

export const PROVIDER_DEFAULT_BASE_URLS: Record<ProviderProfile, string> = {
  anthropic: DEFAULT_ANTHROPIC_OPENAI_BASE_URL,
  canopywave: CANOPYWAVE_OPENAI_BASE_URL,
  openai: DEFAULT_OPENAI_BASE_URL,
  openrouter: DEFAULT_OPENROUTER_OPENAI_BASE_URL,
  grok: DEFAULT_GROK_OPENAI_BASE_URL,
  gemini: DEFAULT_GEMINI_OPENAI_BASE_URL,
  ollama: 'http://localhost:11434',
}

export const PROVIDER_DEFAULT_MODELS: Record<ProviderProfile, string> = {
  anthropic: 'claude-3-5-sonnet-latest',
  canopywave: 'zai/glm-4.6',
  openai: 'gpt-4o',
  openrouter: 'openai/gpt-4o-mini',
  grok: 'grok-2',
  gemini: 'gemini-2.0-flash',
  ollama: 'llama3.1:8b',
}

