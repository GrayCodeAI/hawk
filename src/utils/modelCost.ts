import type { BetaUsage as Usage } from '@hawk/eyrie'
import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from 'src/services/analytics/index.js'
import { logEvent } from 'src/services/analytics/index.js'
import { setHasUnknownModelCost } from '../bootstrap/state.js'
import { isFastModeEnabled } from './fastMode.js'
import {
  HAWK_3_5_HAIKU_CONFIG,
  HAWK_3_5_V2_SONNET_CONFIG,
  HAWK_3_7_SONNET_CONFIG,
  HAWK_HAIKU_4_5_CONFIG,
  HAWK_OPUS_4_1_CONFIG,
  HAWK_OPUS_4_5_CONFIG,
  HAWK_OPUS_4_6_CONFIG,
  HAWK_OPUS_4_CONFIG,
  HAWK_SONNET_4_5_CONFIG,
  HAWK_SONNET_4_6_CONFIG,
  HAWK_SONNET_4_CONFIG,
} from '@hawk/eyrie'
import {
  anthropicNameToCanonical,
  getCanonicalName,
  getDefaultMainLoopModelSetting,
  type ModelShortName,
} from './model/model.js'
import { getProviderCatalogEntry } from './model/providerCatalog.js'
import { getAPIProvider } from './model/providers.js'

// @see https://platform.hawk.com/docs/en/about-hawk/pricing
export type ModelCosts = {
  inputTokens: number
  outputTokens: number
  promptCacheWriteTokens: number
  promptCacheReadTokens: number
  webSearchRequests: number
}

// Standard pricing tier for Sonnet models: $3 input / $15 output per Mtok
export const COST_TIER_3_15 = {
  inputTokens: 3,
  outputTokens: 15,
  promptCacheWriteTokens: 3.75,
  promptCacheReadTokens: 0.3,
  webSearchRequests: 0.01,
} as const satisfies ModelCosts

// Pricing tier for Opus 4/4.1: $15 input / $75 output per Mtok
export const COST_TIER_15_75 = {
  inputTokens: 15,
  outputTokens: 75,
  promptCacheWriteTokens: 18.75,
  promptCacheReadTokens: 1.5,
  webSearchRequests: 0.01,
} as const satisfies ModelCosts

// Pricing tier for Opus 4.5: $5 input / $25 output per Mtok
export const COST_TIER_5_25 = {
  inputTokens: 5,
  outputTokens: 25,
  promptCacheWriteTokens: 6.25,
  promptCacheReadTokens: 0.5,
  webSearchRequests: 0.01,
} as const satisfies ModelCosts

// Fast mode pricing for Opus 4.6: $30 input / $150 output per Mtok
export const COST_TIER_30_150 = {
  inputTokens: 30,
  outputTokens: 150,
  promptCacheWriteTokens: 37.5,
  promptCacheReadTokens: 3,
  webSearchRequests: 0.01,
} as const satisfies ModelCosts

// Pricing for Haiku 3.5: $0.80 input / $4 output per Mtok
export const COST_HAIKU_35 = {
  inputTokens: 0.8,
  outputTokens: 4,
  promptCacheWriteTokens: 1,
  promptCacheReadTokens: 0.08,
  webSearchRequests: 0.01,
} as const satisfies ModelCosts

// Pricing for Haiku 4.5: $1 input / $5 output per Mtok
export const COST_HAIKU_45 = {
  inputTokens: 1,
  outputTokens: 5,
  promptCacheWriteTokens: 1.25,
  promptCacheReadTokens: 0.1,
  webSearchRequests: 0.01,
} as const satisfies ModelCosts

const DEFAULT_UNKNOWN_MODEL_COST = COST_TIER_5_25

/**
 * Get the cost tier for Opus 4.6 based on fast mode.
 */
export function getOpus46CostTier(fastMode: boolean): ModelCosts {
  if (isFastModeEnabled() && fastMode) {
    return COST_TIER_30_150
  }
  return COST_TIER_5_25
}

// Pricing for OpenAI GPT-4o: $2.50 input / $10 output per Mtok
export const COST_GPT4O = {
  inputTokens: 2.5,
  outputTokens: 10,
  promptCacheWriteTokens: 2.5,
  promptCacheReadTokens: 1.25,
  webSearchRequests: 0.01,
} as const satisfies ModelCosts

// Pricing for OpenAI GPT-4o-mini: $0.15 input / $0.60 output per Mtok
export const COST_GPT4O_MINI = {
  inputTokens: 0.15,
  outputTokens: 0.6,
  promptCacheWriteTokens: 0.15,
  promptCacheReadTokens: 0.075,
  webSearchRequests: 0.01,
} as const satisfies ModelCosts

// Pricing for Gemini 2.0 Flash: $0.10 input / $0.40 output per Mtok
export const COST_GEMINI_FLASH = {
  inputTokens: 0.1,
  outputTokens: 0.4,
  promptCacheWriteTokens: 0.1,
  promptCacheReadTokens: 0.025,
  webSearchRequests: 0.01,
} as const satisfies ModelCosts

// Pricing for Gemini 2.5 Pro: $1.25 input / $10 output per Mtok
export const COST_GEMINI_PRO = {
  inputTokens: 1.25,
  outputTokens: 10,
  promptCacheWriteTokens: 1.25,
  promptCacheReadTokens: 0.3125,
  webSearchRequests: 0.01,
} as const satisfies ModelCosts

// Pricing for Grok 2: $2 input / $10 output per Mtok
export const COST_GROK_2 = {
  inputTokens: 2,
  outputTokens: 10,
  promptCacheWriteTokens: 2,
  promptCacheReadTokens: 0.5,
  webSearchRequests: 0.01,
} as const satisfies ModelCosts

// Pricing for OpenCodeGO/Kimi K2.5: $3 input / $10 output per Mtok (matches Eyrie catalog)
export const COST_KIMI_K2_5 = {
  inputTokens: 3,
  outputTokens: 10,
  promptCacheWriteTokens: 3,
  promptCacheReadTokens: 0.5,
  webSearchRequests: 0.01,
} as const satisfies ModelCosts

// Pricing for OpenCodeGO/Kimi K2.6: $3 input / $10 output per Mtok (matches Eyrie catalog)
export const COST_KIMI_K2_6 = {
  inputTokens: 3,
  outputTokens: 10,
  promptCacheWriteTokens: 3,
  promptCacheReadTokens: 0.5,
  webSearchRequests: 0.01,
} as const satisfies ModelCosts

// Pricing for OpenCodeGO/GLM-5.1: $5 input / $15 output per Mtok (matches Eyrie catalog)
export const COST_GLM_5_1 = {
  inputTokens: 5,
  outputTokens: 15,
  promptCacheWriteTokens: 5,
  promptCacheReadTokens: 0.5,
  webSearchRequests: 0.01,
} as const satisfies ModelCosts

// Pricing for OpenCodeGO/GLM-5: $5 input / $15 output per Mtok (matches Eyrie catalog)
export const COST_GLM_5 = {
  inputTokens: 5,
  outputTokens: 15,
  promptCacheWriteTokens: 5,
  promptCacheReadTokens: 0.5,
  webSearchRequests: 0.01,
} as const satisfies ModelCosts

// Pricing for OpenCodeGO/MiMo V2 Pro: $3 input / $10 output per Mtok (matches Eyrie catalog)
export const COST_MIMO_V2_PRO = {
  inputTokens: 3,
  outputTokens: 10,
  promptCacheWriteTokens: 3,
  promptCacheReadTokens: 0.5,
  webSearchRequests: 0.01,
} as const satisfies ModelCosts

// Pricing for OpenCodeGO/MiMo V2 Omni: $2 input / $8 output per Mtok (matches Eyrie catalog)
export const COST_MIMO_V2_OMNI = {
  inputTokens: 2,
  outputTokens: 8,
  promptCacheWriteTokens: 2,
  promptCacheReadTokens: 0.5,
  webSearchRequests: 0.01,
} as const satisfies ModelCosts

// Pricing for OpenCodeGO/MiniMax M2.7: $1 input / $3 output per Mtok (matches Eyrie catalog)
export const COST_MINIMAX_M2_7 = {
  inputTokens: 1,
  outputTokens: 3,
  promptCacheWriteTokens: 1,
  promptCacheReadTokens: 0.5,
  webSearchRequests: 0.01,
} as const satisfies ModelCosts

// Pricing for OpenCodeGO/MiniMax M2.5: $0.5 input / $1.5 output per Mtok (matches Eyrie catalog)
export const COST_MINIMAX_M2_5 = {
  inputTokens: 0.5,
  outputTokens: 1.5,
  promptCacheWriteTokens: 0.5,
  promptCacheReadTokens: 0.25,
  webSearchRequests: 0.01,
} as const satisfies ModelCosts

// Pricing for OpenCodeGO/Qwen3.6 Plus: $0.3 input / $1.7 output per Mtok (matches Eyrie catalog)
export const COST_QWEN_3_6_PLUS = {
  inputTokens: 0.3,
  outputTokens: 1.7,
  promptCacheWriteTokens: 0.3,
  promptCacheReadTokens: 0.1,
  webSearchRequests: 0.01,
} as const satisfies ModelCosts

// Pricing for OpenCodeGO/Qwen3.5 Plus: $0.26 input / $1.56 output per Mtok (matches Eyrie catalog)
export const COST_QWEN_3_5_PLUS = {
  inputTokens: 0.26,
  outputTokens: 1.56,
  promptCacheWriteTokens: 0.26,
  promptCacheReadTokens: 0.08,
  webSearchRequests: 0.01,
} as const satisfies ModelCosts

// Pricing for local Ollama models: $0 (self-hosted)
export const COST_OLLAMA = {
  inputTokens: 0,
  outputTokens: 0,
  promptCacheWriteTokens: 0,
  promptCacheReadTokens: 0,
  webSearchRequests: 0.01,
} as const satisfies ModelCosts

// @[MODEL LAUNCH]: Add a pricing entry for the new model below.
// Costs from https://platform.hawk.com/docs/en/about-hawk/pricing
// Web search cost: $10 per 1000 requests = $0.01 per request
export const MODEL_COSTS: Record<ModelShortName, ModelCosts> = {
  // Anthropic models
  [anthropicNameToCanonical(HAWK_3_5_HAIKU_CONFIG.anthropic)]:
    COST_HAIKU_35,
  [anthropicNameToCanonical(HAWK_HAIKU_4_5_CONFIG.anthropic)]:
    COST_HAIKU_45,
  [anthropicNameToCanonical(HAWK_3_5_V2_SONNET_CONFIG.anthropic)]:
    COST_TIER_3_15,
  [anthropicNameToCanonical(HAWK_3_7_SONNET_CONFIG.anthropic)]:
    COST_TIER_3_15,
  [anthropicNameToCanonical(HAWK_SONNET_4_CONFIG.anthropic)]:
    COST_TIER_3_15,
  [anthropicNameToCanonical(HAWK_SONNET_4_5_CONFIG.anthropic)]:
    COST_TIER_3_15,
  [anthropicNameToCanonical(HAWK_SONNET_4_6_CONFIG.anthropic)]:
    COST_TIER_3_15,
  [anthropicNameToCanonical(HAWK_OPUS_4_CONFIG.anthropic)]: COST_TIER_15_75,
  [anthropicNameToCanonical(HAWK_OPUS_4_1_CONFIG.anthropic)]:
    COST_TIER_15_75,
  [anthropicNameToCanonical(HAWK_OPUS_4_5_CONFIG.anthropic)]:
    COST_TIER_5_25,
  [anthropicNameToCanonical(HAWK_OPUS_4_6_CONFIG.anthropic)]:
    COST_TIER_5_25,

  // OpenAI models
  'gpt-4o': COST_GPT4O,
  'gpt-4o-mini': COST_GPT4O_MINI,
  'gpt-4o-2024-08-06': COST_GPT4O,
  'gpt-4o-2024-05-13': COST_GPT4O,
  'gpt-4o-mini-2024-07-18': COST_GPT4O_MINI,

  // Gemini models
  'gemini-2.0-flash': COST_GEMINI_FLASH,
  'gemini-2.0-flash-exp': COST_GEMINI_FLASH,
  'gemini-2.5-pro': COST_GEMINI_PRO,
  'gemini-2.5-pro-preview-03-25': COST_GEMINI_PRO,

  // Grok models
  'grok-2': COST_GROK_2,
  'grok-2-1212': COST_GROK_2,
  'grok-2-latest': COST_GROK_2,

  // OpenCodeGO / Kimi models
  'kimi-k2.5': COST_KIMI_K2_5,
  'moonshotai/kimi-k2.5': COST_KIMI_K2_5,
  'kimi-k2.6': COST_KIMI_K2_6,
  'moonshotai/kimi-k2.6': COST_KIMI_K2_6,

  // OpenCodeGO / GLM models
  'glm-5.1': COST_GLM_5_1,
  'glm-5': COST_GLM_5,
  'zhipuai/glm-5.1': COST_GLM_5_1,
  'zhipuai/glm-5': COST_GLM_5,

  // OpenCodeGO / MiMo models
  'mimo-v2-pro': COST_MIMO_V2_PRO,
  'mimo-v2-omni': COST_MIMO_V2_OMNI,

  // OpenCodeGO / MiniMax models
  'minimax-m2.7': COST_MINIMAX_M2_7,
  'minimax-m2.5': COST_MINIMAX_M2_5,

  // OpenCodeGO / Qwen models
  'qwen3.6-plus': COST_QWEN_3_6_PLUS,
  'qwen3.5-plus': COST_QWEN_3_5_PLUS,

  // Ollama (local) models
  'llama3.1:8b': COST_OLLAMA,
  'llama3.1:70b': COST_OLLAMA,
  'llama3.2:3b': COST_OLLAMA,
  'qwen2.5-coder:7b': COST_OLLAMA,
  'qwen2.5-coder:14b': COST_OLLAMA,
  'qwen2.5-coder:32b': COST_OLLAMA,
}

/**
 * Calculates the USD cost based on token usage and model cost configuration
 */
function tokensToUSDCost(modelCosts: ModelCosts, usage: Usage): number {
  return (
    (usage.input_tokens / 1_000_000) * modelCosts.inputTokens +
    (usage.output_tokens / 1_000_000) * modelCosts.outputTokens +
    ((usage.cache_read_input_tokens ?? 0) / 1_000_000) *
      modelCosts.promptCacheReadTokens +
    ((usage.cache_creation_input_tokens ?? 0) / 1_000_000) *
      modelCosts.promptCacheWriteTokens +
    (usage.server_tool_use?.web_search_requests ?? 0) *
      modelCosts.webSearchRequests
  )
}

/**
 * Try to get costs from Eyrie catalog (for OpenCodeGO, OpenRouter, CanopyWave)
 * Falls back to hardcoded MODEL_COSTS for Anthropic and other providers
 */
function getCostsFromCatalog(model: string): ModelCosts | null {
  const provider = getAPIProvider()
  const entry = getProviderCatalogEntry(provider, model)

  if (entry?.input_price_per_1m !== undefined && entry?.output_price_per_1m !== undefined) {
    return {
      inputTokens: entry.input_price_per_1m,
      outputTokens: entry.output_price_per_1m,
      promptCacheWriteTokens: entry.input_price_per_1m, // Use input price as default
      promptCacheReadTokens: entry.input_price_per_1m * 0.1, // Rough estimate
      webSearchRequests: 0.01,
    }
  }

  return null
}

export function getModelCosts(model: string, usage: Usage): ModelCosts {
  const shortName = getCanonicalName(model)

  // Check if this is an Opus 4.6 model with fast mode active.
  if (
    shortName === anthropicNameToCanonical(HAWK_OPUS_4_6_CONFIG.anthropic)
  ) {
    const isFastMode = usage.speed === 'fast'
    return getOpus46CostTier(isFastMode)
  }

  // Try to get costs from Eyrie catalog first (for 3P providers like OpenCodeGO)
  const catalogCosts = getCostsFromCatalog(model)
  if (catalogCosts) {
    return catalogCosts
  }

  // Try to find costs by canonical name first
  let costs = MODEL_COSTS[shortName]

  // If not found, try the original model name (for non-Anthropic providers)
  if (!costs) {
    costs = MODEL_COSTS[model as ModelShortName]
  }

  // If still not found, try common model ID patterns
  if (!costs) {
    // Handle OpenRouter-style prefixes (e.g., "openai/gpt-4o")
    const withoutPrefix = model.split('/').pop() ?? model
    costs = MODEL_COSTS[withoutPrefix as ModelShortName]
  }

  if (!costs) {
    trackUnknownModelCost(model, shortName)
    return (
      MODEL_COSTS[getCanonicalName(getDefaultMainLoopModelSetting())] ??
      DEFAULT_UNKNOWN_MODEL_COST
    )
  }
  return costs
}

function trackUnknownModelCost(model: string, shortName: ModelShortName): void {
  logEvent('tengu_unknown_model_cost', {
    model: model as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    shortName:
      shortName as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  })
  setHasUnknownModelCost()
}

// Calculate the cost of a query in US dollars.
// If the model's costs are not found, use the default model's costs.
export function calculateUSDCost(resolvedModel: string, usage: Usage): number {
  const modelCosts = getModelCosts(resolvedModel, usage)
  return tokensToUSDCost(modelCosts, usage)
}

/**
 * Calculate cost from raw token counts without requiring a full BetaUsage object.
 * Useful for side queries (e.g. classifier) that track token counts independently.
 */
export function calculateCostFromTokens(
  model: string,
  tokens: {
    inputTokens: number
    outputTokens: number
    cacheReadInputTokens: number
    cacheCreationInputTokens: number
  },
): number {
  const usage: Usage = {
    input_tokens: tokens.inputTokens,
    output_tokens: tokens.outputTokens,
    cache_read_input_tokens: tokens.cacheReadInputTokens,
    cache_creation_input_tokens: tokens.cacheCreationInputTokens,
  } as Usage
  return calculateUSDCost(model, usage)
}

function formatPrice(price: number): string {
  // Format price: integers without decimals, others with 2 decimal places
  // e.g., 3 -> "$3", 0.8 -> "$0.80", 22.5 -> "$22.50"
  if (Number.isInteger(price)) {
    return `$${price}`
  }
  return `$${price.toFixed(2)}`
}

/**
 * Format model costs as a pricing string for display
 * e.g., "$3/$15 per Mtok"
 */
export function formatModelPricing(costs: ModelCosts): string {
  return `${formatPrice(costs.inputTokens)}/${formatPrice(costs.outputTokens)} per Mtok`
}

/**
 * Get formatted pricing string for a model
 * Accepts either a short name or full model name
 * Returns undefined if model is not found
 */
export function getModelPricingString(model: string): string | undefined {
  const shortName = getCanonicalName(model)
  const costs = MODEL_COSTS[shortName]
  if (!costs) return undefined
  return formatModelPricing(costs)
}
