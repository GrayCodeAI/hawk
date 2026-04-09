import type { ModelName } from './model.js'
import type { APIProvider } from './providers.js'
import { getProviderCatalogModelIds } from './providerCatalog.js'

export type ModelConfig = Record<APIProvider, ModelName>

// ---------------------------------------------------------------------------
// OpenAI-compatible model mappings
// Maps Hawk model tiers to sensible defaults for popular providers.
// Override with OPENAI_MODEL, GRAYCODE_MODEL, or settings.model
// ---------------------------------------------------------------------------
export const OPENAI_MODEL_DEFAULTS = {
  opus: 'gpt-4o', // best reasoning
  sonnet: 'gpt-4o-mini', // balanced
  haiku: 'gpt-4o-mini', // fast & cheap
} as const

// ---------------------------------------------------------------------------
// Gemini model mappings
// Maps Hawk model tiers to Google Gemini equivalents.
// Override with GEMINI_MODEL env var.
// ---------------------------------------------------------------------------
export const GEMINI_MODEL_DEFAULTS = {
  opus: 'gemini-2.5-pro-preview-03-25', // most capable
  sonnet: 'gemini-2.0-flash', // balanced
  haiku: 'gemini-2.0-flash-lite', // fast & cheap
} as const

// @[MODEL LAUNCH]: Add a new HAWK_*_CONFIG constant here. Double check the correct model strings
// here since the pattern may change.

export const HAWK_3_7_SONNET_CONFIG = {
  anthropic: 'claude-3-7-sonnet-20250219',
  openai: 'gpt-4o-mini',
  openrouter: 'openai/gpt-4o-mini',
  grok: 'grok-2',
  gemini: 'gemini-2.0-flash',
  ollama: 'llama3.1:8b',
} as const satisfies ModelConfig

export const HAWK_3_5_V2_SONNET_CONFIG = {
  anthropic: 'claude-3-5-sonnet-20241022',
  openai: 'gpt-4o-mini',
  openrouter: 'openai/gpt-4o-mini',
  grok: 'grok-2',
  gemini: 'gemini-2.0-flash',
  ollama: 'llama3.1:8b',
} as const satisfies ModelConfig

export const HAWK_3_5_HAIKU_CONFIG = {
  anthropic: 'claude-3-5-haiku-20241022',
  openai: 'gpt-4o-mini',
  openrouter: 'openai/gpt-4o-mini',
  grok: 'grok-2',
  gemini: 'gemini-2.0-flash-lite',
  ollama: 'llama3.2:3b',
} as const satisfies ModelConfig

export const HAWK_HAIKU_4_5_CONFIG = {
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-4o-mini',
  openrouter: 'openai/gpt-4o-mini',
  grok: 'grok-2',
  gemini: 'gemini-2.0-flash-lite',
  ollama: 'llama3.2:3b',
} as const satisfies ModelConfig

export const HAWK_SONNET_4_CONFIG = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o-mini',
  openrouter: 'openai/gpt-4o-mini',
  grok: 'grok-2',
  gemini: 'gemini-2.0-flash',
  ollama: 'llama3.1:8b',
} as const satisfies ModelConfig

export const HAWK_SONNET_4_5_CONFIG = {
  anthropic: 'claude-sonnet-4-5-20250929',
  openai: 'gpt-4o',
  openrouter: 'openai/gpt-4o',
  grok: 'grok-2',
  gemini: 'gemini-2.0-flash',
  ollama: 'llama3.1:70b',
} as const satisfies ModelConfig

export const HAWK_OPUS_4_CONFIG = {
  anthropic: 'claude-opus-4-20250514',
  openai: 'gpt-4o',
  openrouter: 'openai/gpt-4o',
  grok: 'grok-2',
  gemini: 'gemini-2.5-pro-preview-03-25',
  ollama: 'llama3.1:70b',
} as const satisfies ModelConfig

export const HAWK_OPUS_4_1_CONFIG = {
  anthropic: 'claude-opus-4-1-20250805',
  openai: 'gpt-4o',
  openrouter: 'openai/gpt-4o',
  grok: 'grok-2',
  gemini: 'gemini-2.5-pro-preview-03-25',
  ollama: 'llama3.1:70b',
} as const satisfies ModelConfig

export const HAWK_OPUS_4_5_CONFIG = {
  anthropic: 'claude-opus-4-5-20251101',
  openai: 'gpt-4o',
  openrouter: 'openai/gpt-4o',
  grok: 'grok-2',
  gemini: 'gemini-2.5-pro-preview-03-25',
  ollama: 'llama3.1:70b',
} as const satisfies ModelConfig

export const HAWK_OPUS_4_6_CONFIG = {
  anthropic: 'claude-opus-4-6',
  openai: 'gpt-4o',
  openrouter: 'openai/gpt-4o',
  grok: 'grok-2',
  gemini: 'gemini-2.5-pro-preview-03-25',
  ollama: 'llama3.1:70b',
} as const satisfies ModelConfig

export const HAWK_SONNET_4_6_CONFIG = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4o',
  openrouter: 'openai/gpt-4o',
  grok: 'grok-2',
  gemini: 'gemini-2.0-flash',
  ollama: 'llama3.1:70b',
} as const satisfies ModelConfig

// @[MODEL LAUNCH]: Register the new config here.
export const ALL_MODEL_CONFIGS = {
  haiku35: HAWK_3_5_HAIKU_CONFIG,
  haiku45: HAWK_HAIKU_4_5_CONFIG,
  sonnet35: HAWK_3_5_V2_SONNET_CONFIG,
  sonnet37: HAWK_3_7_SONNET_CONFIG,
  sonnet40: HAWK_SONNET_4_CONFIG,
  sonnet45: HAWK_SONNET_4_5_CONFIG,
  sonnet46: HAWK_SONNET_4_6_CONFIG,
  opus40: HAWK_OPUS_4_CONFIG,
  opus41: HAWK_OPUS_4_1_CONFIG,
  opus45: HAWK_OPUS_4_5_CONFIG,
  opus46: HAWK_OPUS_4_6_CONFIG,
} as const satisfies Record<string, ModelConfig>

export type ModelKey = keyof typeof ALL_MODEL_CONFIGS

/** Union of all canonical Anthropic model IDs, e.g. 'claude-opus-4-6' | 'claude-sonnet-4-5-20250929' | … */
export type CanonicalModelId =
  (typeof ALL_MODEL_CONFIGS)[ModelKey]['anthropic']

/** Runtime list of canonical model IDs — used by comprehensiveness tests. */
export const CANONICAL_MODEL_IDS = Object.values(ALL_MODEL_CONFIGS).map(
  c => c.anthropic,
) as [CanonicalModelId, ...CanonicalModelId[]]

/** Map canonical ID → internal short key. Used to apply settings-based modelOverrides. */
export const CANONICAL_ID_TO_KEY: Record<CanonicalModelId, ModelKey> =
  Object.fromEntries(
    (Object.entries(ALL_MODEL_CONFIGS) as [ModelKey, ModelConfig][]).map(
      ([key, cfg]) => [cfg.anthropic, key],
    ),
  ) as Record<CanonicalModelId, ModelKey>

export type ModelTier = 'opus' | 'sonnet' | 'haiku'

const PREFERRED_MODEL_KEYS_BY_PROVIDER: Record<
  APIProvider,
  Record<ModelTier, ModelKey>
> = {
  anthropic: {
    opus: 'opus46',
    sonnet: 'sonnet46',
    haiku: 'haiku45',
  },
  openai: {
    opus: 'opus46',
    sonnet: 'sonnet46',
    haiku: 'haiku45',
  },
  openrouter: {
    opus: 'opus46',
    sonnet: 'sonnet46',
    haiku: 'haiku45',
  },
  grok: {
    opus: 'opus46',
    sonnet: 'sonnet46',
    haiku: 'haiku45',
  },
  gemini: {
    opus: 'opus46',
    sonnet: 'sonnet46',
    haiku: 'haiku45',
  },
  ollama: {
    opus: 'opus46',
    sonnet: 'sonnet46',
    haiku: 'haiku45',
  },
}

const MODEL_FALLBACK_KEYS_BY_TIER: Record<ModelTier, ModelKey[]> = {
  opus: ['opus46', 'opus45', 'opus41', 'opus40'],
  sonnet: ['sonnet46', 'sonnet45', 'sonnet40', 'sonnet37', 'sonnet35'],
  haiku: ['haiku45', 'haiku35'],
}

function getProviderModelPool(provider: APIProvider): ModelName[] {
  const seen = new Set<ModelName>()
  const ordered: ModelName[] = []
  for (const key of MODEL_KEYS) {
    const model = ALL_MODEL_CONFIGS[key][provider]
    if (!seen.has(model)) {
      seen.add(model)
      ordered.push(model)
    }
  }
  return ordered
}

function modelForProviderKey(
  provider: APIProvider,
  key: ModelKey,
): ModelName | null {
  const model = ALL_MODEL_CONFIGS[key][provider]
  return model ? model : null
}

/**
 * Ordered candidate models for a provider/tier pair:
 * preferred launch target first, then older fallbacks.
 */
export function getProviderModelCandidates(
  provider: APIProvider,
  tier: ModelTier,
): ModelName[] {
  const seen = new Set<ModelName>()
  const ordered: ModelName[] = []

  const preferredKey = PREFERRED_MODEL_KEYS_BY_PROVIDER[provider][tier]
  const preferred = modelForProviderKey(provider, preferredKey)
  if (preferred && !seen.has(preferred)) {
    seen.add(preferred)
    ordered.push(preferred)
  }

  for (const key of MODEL_FALLBACK_KEYS_BY_TIER[tier]) {
    const model = modelForProviderKey(provider, key)
    if (model && !seen.has(model)) {
      seen.add(model)
      ordered.push(model)
    }
  }

  return ordered
}

/**
 * Preferred default model for a provider/tier pair, with safe fallback when
 * the preferred mapping is unavailable in the current provider model table.
 */
export function getPreferredProviderModel(
  provider: APIProvider,
  tier: ModelTier,
): ModelName {
  const candidates = getProviderModelCandidates(provider, tier)
  const catalogIds = getProviderCatalogModelIds(provider)
  if (catalogIds && catalogIds.size > 0) {
    for (const candidate of candidates) {
      if (catalogIds.has(candidate)) {
        return candidate
      }
    }
    const firstCatalogModel = catalogIds.values().next().value
    if (firstCatalogModel) {
      return firstCatalogModel
    }
  }

  if (candidates.length > 0) {
    return candidates[0]
  }

  const pool = getProviderModelPool(provider)
  if (pool.length > 0) {
    return pool[0]
  }

  return ALL_MODEL_CONFIGS.sonnet46[provider]
}
