// biome-ignore-all assist/source/organizeImports: ANT-ONLY import markers must not be reordered
/**
 * Ensure that any model codenames introduced here are also added to
 * scripts/excluded-strings.txt to avoid leaking them. Wrap any codename string
 * literals with process.env.USER_TYPE === 'ant' for Bun to remove the codenames
 * during dead code elimination
 */
import { getMainLoopModelOverride } from '../../bootstrap/state.js'
import {
  getSubscriptionType,
  isHawkAISubscriber,
  isMaxSubscriber,
  isProSubscriber,
  isTeamPremiumSubscriber,
} from '../auth.js'
import {
  has1mContext,
  is1mContextDisabled,
  modelSupports1M,
} from '../context.js'
import { isEnvTruthy } from '../envUtils.js'
import { getModelStrings, resolveOverriddenModel } from './modelStrings.js'
import { formatModelPricing, getOpus46CostTier } from '../modelCost.js'
import { getSettings_DEPRECATED } from '../settings/settings.js'
import type { PermissionMode } from '../permissions/PermissionMode.js'
import { getAPIProvider } from './providers.js'
import { LIGHTNING_BOLT } from '../../constants/figures.js'
import { isModelAllowed } from './modelAllowlist.js'
import { type ModelAlias, isModelAlias } from './aliases.js'
import { capitalize } from '../stringUtils.js'
import {
  ALL_MODEL_CONFIGS,
  getPreferredProviderModel,
  getProviderDefaultModel,
} from '@hawk/eyrie'
import {
  defaultProviderFromConfig,
  getProviderActiveModel,
  loadProviderConfig,
} from '../providerConfig.js'

export type ModelShortName = string
export type ModelName = string
export type ModelSetting = ModelName | ModelAlias | null

/**
 * Derive a human-readable display name from a model key.
 * e.g. "opus46" → "Opus 4.6", "sonnet35" → "Sonnet 3.5", "haiku45" → "Haiku 4.5"
 */
function keyToDisplayName(key: string): string {
  const match = key.match(/^(opus|sonnet|haiku)(\d+)$/)
  if (!match) return capitalize(key)
  const [, family, version] = match
  const formattedVersion = version.length > 1
    ? `${version.slice(0, -1)}.${version.slice(-1)}`
    : version
  return `${capitalize(family)} ${formattedVersion}`
}

// Eagerly built dynamic mappings from ALL_MODEL_CONFIGS.
// These are computed at module load time so they're available for
// top-level calls (e.g. from modelCost.ts).
const CANONICAL_TO_DISPLAY_NAME = new Map<string, string>()
const CANONICAL_TO_SHORT_NAME = new Map<string, string>()

for (const [key, config] of Object.entries(ALL_MODEL_CONFIGS)) {
  const displayName = keyToDisplayName(key)
  const canonicalId = config.anthropic
  CANONICAL_TO_DISPLAY_NAME.set(canonicalId, displayName)
  const shortName = canonicalId.replace(/-\d{8}$/, '')
  CANONICAL_TO_SHORT_NAME.set(canonicalId, shortName)
}

function getOpenAICompatibleProviderModelEnv(provider: ReturnType<typeof getAPIProvider>): string | undefined {
  if (provider === 'canopywave') {
    return process.env.CANOPYWAVE_MODEL || process.env.OPENAI_MODEL
  }
  if (provider === 'openrouter') {
    return process.env.OPENROUTER_MODEL || process.env.OPENAI_MODEL
  }
  if (provider === 'openai') {
    return process.env.OPENAI_MODEL
  }
  return undefined
}

export function getSmallFastModel(): ModelName {
  if (process.env.GRAYCODE_SMALL_FAST_MODEL) return process.env.GRAYCODE_SMALL_FAST_MODEL
  const provider = getAPIProvider()
  // For Gemini provider, use a fast model
  if (provider === 'gemini') {
    return process.env.GEMINI_MODEL || getProviderDefaultModel('gemini')
  }
  // For OpenAI provider, use OPENAI_MODEL or a sensible default
  if (provider === 'openai' || provider === 'canopywave' || provider === 'openrouter') {
    return getOpenAICompatibleProviderModelEnv(provider) || getProviderDefaultModel(provider)
  }
  return provider === 'anthropic'
    ? getPreferredProviderModel(provider, 'haiku')
    : getProviderDefaultModel(provider)
}

export function isNonCustomOpusModel(model: ModelName): boolean {
  return (
    model === getModelStrings().opus40 ||
    model === getModelStrings().opus41 ||
    model === getModelStrings().opus45 ||
    model === getModelStrings().opus46
  )
}

/**
 * Helper to get the model from /model (including via /config), the --model flag,
 * saved settings, or provider config. The returned value can be a model alias
 * if that's what the user specified.
 * Undefined if the user didn't configure anything, in which case we fall back to
 * the default (null).
 *
 * Priority order within this function:
 * 1. Model override during session (from /model command) - highest priority
 * 2. Model override at startup (from --model flag)
 * 3. Settings (from user's saved settings via /model)
 * 4. Provider config active model (from /config)
 */
export function getUserSpecifiedModelSetting(): ModelSetting | undefined {
  let specifiedModel: ModelSetting | undefined

  const modelOverride = getMainLoopModelOverride()
  if (modelOverride !== undefined) {
    specifiedModel = modelOverride
  } else {
    const providerConfig = loadProviderConfig()
    const provider = defaultProviderFromConfig(providerConfig)
    const providerModel =
      providerConfig && provider
        ? getProviderActiveModel(providerConfig, provider)
        : undefined
    const settings = getSettings_DEPRECATED() || {}
    specifiedModel =
      settings.model ||
      providerModel ||
      undefined
  }

  // Ignore the user-specified model if it's not in the availableModels allowlist.
  if (specifiedModel && !isModelAllowed(specifiedModel)) {
    return undefined
  }

  return specifiedModel
}

/**
 * Get the main loop model to use for the current session.
 *
 * Model Selection Priority Order:
 * 1. Model override during session (from /model command) - highest priority
 * 2. Model override at startup (from --model flag)
 * 3. Settings (from user's saved settings via /model)
 * 4. Provider config active model (from /config)
 * 5. Built-in default
 *
 * @returns The resolved model name to use
 */
export function getMainLoopModel(): ModelName {
  const model = getUserSpecifiedModelSetting()
  if (model !== undefined && model !== null) {
    return parseUserSpecifiedModel(model)
  }
  return getDefaultMainLoopModel()
}

export function getBestModel(): ModelName {
  return getDefaultOpusModel()
}

// @[MODEL LAUNCH]: Update the default Opus model.
export function getDefaultOpusModel(): ModelName {
  if (process.env.GRAYCODE_DEFAULT_OPUS_MODEL) {
    return process.env.GRAYCODE_DEFAULT_OPUS_MODEL
  }
  const provider = getAPIProvider()
  // Gemini provider
  if (provider === 'gemini') {
    return process.env.GEMINI_MODEL || getProviderDefaultModel('gemini')
  }
  // OpenAI provider: use user-specified model or default
  if (provider === 'openai' || provider === 'canopywave' || provider === 'openrouter') {
    return getOpenAICompatibleProviderModelEnv(provider) || getProviderDefaultModel(provider)
  }
  return provider === 'anthropic'
    ? getPreferredProviderModel(provider, 'opus')
    : getProviderDefaultModel(provider)
}

// @[MODEL LAUNCH]: Update the default Sonnet model.
export function getDefaultSonnetModel(): ModelName {
  if (process.env.GRAYCODE_DEFAULT_SONNET_MODEL) {
    return process.env.GRAYCODE_DEFAULT_SONNET_MODEL
  }
  const provider = getAPIProvider()
  // Gemini provider
  if (provider === 'gemini') {
    return process.env.GEMINI_MODEL || getProviderDefaultModel('gemini')
  }
  // OpenAI provider
  if (provider === 'openai' || provider === 'canopywave' || provider === 'openrouter') {
    return getOpenAICompatibleProviderModelEnv(provider) || getProviderDefaultModel(provider)
  }
  return provider === 'anthropic'
    ? getPreferredProviderModel(provider, 'sonnet')
    : getProviderDefaultModel(provider)
}

// @[MODEL LAUNCH]: Update the default Haiku model.
export function getDefaultHaikuModel(): ModelName {
  if (process.env.GRAYCODE_DEFAULT_HAIKU_MODEL) {
    return process.env.GRAYCODE_DEFAULT_HAIKU_MODEL
  }
  const provider = getAPIProvider()
  // Gemini provider
  if (provider === 'gemini') {
    return process.env.GEMINI_MODEL || getProviderDefaultModel('gemini')
  }
  // OpenAI provider
  if (provider === 'openai' || provider === 'canopywave' || provider === 'openrouter') {
    return getOpenAICompatibleProviderModelEnv(provider) || getProviderDefaultModel(provider)
  }
  return provider === 'anthropic'
    ? getPreferredProviderModel(provider, 'haiku')
    : getProviderDefaultModel(provider)
}

/**
 * Get the model to use for runtime, depending on the runtime context.
 * @param params Subset of the runtime context to determine the model to use.
 * @returns The model to use
 */
export function getRuntimeMainLoopModel(params: {
  permissionMode: PermissionMode
  mainLoopModel: string
  exceeds200kTokens?: boolean
}): ModelName {
  const { permissionMode, mainLoopModel, exceeds200kTokens = false } = params

  // opusplan uses Opus in plan mode without [1m] suffix.
  if (
    getUserSpecifiedModelSetting() === 'opusplan' &&
    permissionMode === 'plan' &&
    !exceeds200kTokens
  ) {
    return getDefaultOpusModel()
  }

  // sonnetplan by default
  if (getUserSpecifiedModelSetting() === 'haiku' && permissionMode === 'plan') {
    return getDefaultSonnetModel()
  }

  return mainLoopModel
}

/**
 * Get the default main loop model setting.
 *
 * This handles the built-in default:
 * - Opus for Max and Team Premium users
 * - Sonnet 4.6 for all other users (including Team Standard, Pro, Enterprise)
 *
 * @returns The default model setting to use
 */
export function getDefaultMainLoopModelSetting(): ModelName | ModelAlias {
  const provider = getAPIProvider()
  // Gemini provider: always use the configured Gemini model
  if (provider === 'gemini') {
    return process.env.GEMINI_MODEL || getProviderDefaultModel('gemini')
  }
  // OpenAI provider: always use the configured OpenAI model
  if (provider === 'openai' || provider === 'canopywave' || provider === 'openrouter') {
    return getOpenAICompatibleProviderModelEnv(provider) || getProviderDefaultModel(provider)
  }

  // Ants default to defaultModel from flag config, or Opus 1M if not configured
  if (process.env.USER_TYPE === 'ant') {
    return (
      getAntModelOverrideConfig()?.defaultModel ??
      getDefaultOpusModel() + '[1m]'
    )
  }

  // Max users get Opus as default
  if (isMaxSubscriber()) {
    return getDefaultOpusModel() + (isOpus1mMergeEnabled() ? '[1m]' : '')
  }

  // Team Premium gets Opus (same as Max)
  if (isTeamPremiumSubscriber()) {
    return getDefaultOpusModel() + (isOpus1mMergeEnabled() ? '[1m]' : '')
  }

  // PAYG (1P and 3P), Enterprise, Team Standard, and Pro get Sonnet as default
  // Note that PAYG (3P) may default to an older Sonnet model
  return getDefaultSonnetModel()
}

/**
 * Synchronous operation to get the default main loop model to use
 * (bypassing any user-specified values).
 */
export function getDefaultMainLoopModel(): ModelName {
  return parseUserSpecifiedModel(getDefaultMainLoopModelSetting())
}

/**
 * Pure string-match that strips date/provider suffixes from a first-party model
 * name. Input must already be a 1P-format ID (e.g. 'claude-3-7-sonnet-20250219',
 * 'us.graycode.claude-opus-4-6-v1:0'). Does not touch settings, so safe at
 * module top-level (see MODEL_COSTS in modelCost.ts).
 *
 * Self-contained: does not depend on runtime-initialized maps so it works
 * during module load.
 */
export function anthropicNameToCanonical(name: ModelName): ModelShortName {
  name = name.toLowerCase()

  // Strip [1m] or [2m] context suffix
  name = name.replace(/\[(1|2)m\]$/i, '')

  // Strip Bedrock/provider suffixes: us.graycode.claude-opus-4-6-v1:0 → claude-opus-4-6
  // Also strips date suffixes: claude-opus-4-5-20251101 → claude-opus-4-5
  const claudeMatch = name.match(/(claude-[\w-]+?)(?:-\d{8})?(?:-v\d+:\d+)?$/)
  if (claudeMatch) {
    return claudeMatch[1]!
  }

  // Fallback: extract claude-{family} pattern
  const match = name.match(/(claude-(\d+-\d+-)?\w+)/)
  if (match && match[1]) {
    return match[1]
  }

  return name
}

/**
 * Maps a full model string to a shorter canonical version that's unified across 1P and 3P providers.
 * For example, 'claude-3-5-haiku-20241022' and 'us.graycode.claude-3-5-haiku-20241022-v1:0'
 * would both be mapped to 'claude-3-5-haiku'.
 * @param fullModelName The full model name (e.g., 'claude-3-5-haiku-20241022')
 * @returns The short name (e.g., 'claude-3-5-haiku') if found, or the original name if no mapping exists
 */
export function getCanonicalName(fullModelName: ModelName): ModelShortName {
  // Resolve overridden model IDs (e.g. Bedrock ARNs) back to canonical names.
  // resolved is always an Anthropic-format ID, so anthropicNameToCanonical can handle it.
  return anthropicNameToCanonical(resolveOverriddenModel(fullModelName))
}

/**
 * Returns a description of the default model for the current user tier.
 *
 * Dynamic: derives model names from the current default models.
 */
export function getHawkAiUserDefaultModelDescription(
  fastMode = false,
): string {
  const opusName = getPublicModelDisplayName(getDefaultOpusModel()) ?? 'Opus'
  const sonnetName = getPublicModelDisplayName(getDefaultSonnetModel()) ?? 'Sonnet'

  if (isMaxSubscriber() || isTeamPremiumSubscriber()) {
    if (isOpus1mMergeEnabled()) {
      return `${opusName} with 1M context · Most capable for complex work${fastMode ? getOpus46PricingSuffix(true) : ''}`
    }
    return `${opusName} · Most capable for complex work${fastMode ? getOpus46PricingSuffix(true) : ''}`
  }
  return `${sonnetName} · Best for everyday tasks`
}

export function renderDefaultModelSetting(
  setting: ModelName | ModelAlias,
): string {
  if (setting === 'opusplan') {
    return 'Opus 4.6 in plan mode, else Sonnet 4.6'
  }
  return renderModelName(parseUserSpecifiedModel(setting))
}

export function getOpus46PricingSuffix(fastMode: boolean): string {
  if (getAPIProvider() !== 'anthropic') return ''
  const pricing = formatModelPricing(getOpus46CostTier(fastMode))
  const fastModeIndicator = fastMode ? ` (${LIGHTNING_BOLT})` : ''
  return ` ·${fastModeIndicator} ${pricing}`
}

export function isOpus1mMergeEnabled(): boolean {
  if (
    is1mContextDisabled() ||
    isProSubscriber() ||
    getAPIProvider() !== 'anthropic'
  ) {
    return false
  }
  // Fail closed when a subscriber's subscription type is unknown. The VS Code
  // config-loading subprocess can have OAuth tokens with valid scopes but no
  // subscriptionType field (stale or partial refresh). Without this guard,
  // isProSubscriber() returns false for such users and the merge leaks
  // opus[1m] into the model dropdown — the API then rejects it with a
  // misleading "rate limit reached" error.
  if (isHawkAISubscriber() && getSubscriptionType() === null) {
    return false
  }
  return true
}

export function renderModelSetting(setting: ModelName | ModelAlias): string {
  if (setting === 'opusplan') {
    return 'Opus Plan'
  }
  if (isModelAlias(setting)) {
    return capitalize(setting)
  }
  return renderModelName(setting)
}

/**
 * Returns a human-readable display name for known public models, or null
 * if the model is not recognized as a public model.
 *
 * Dynamic: derives display names from ALL_MODEL_CONFIGS model keys.
 * New models are automatically included without code changes.
 */
export function getPublicModelDisplayName(model: ModelName): string | null {
  const has1m = model.toLowerCase().endsWith('[1m]')
  const baseModel = has1m ? model.slice(0, -4) : model

  // Check against canonical Anthropic IDs first (works in all environments)
  for (const [key, config] of Object.entries(ALL_MODEL_CONFIGS)) {
    const canonicalId = config.anthropic
    if (baseModel === canonicalId || baseModel.startsWith(canonicalId + '-')) {
      const displayName = CANONICAL_TO_DISPLAY_NAME.get(key) ?? keyToDisplayName(key)
      return has1m ? `${displayName} (1M context)` : displayName
    }
  }

  // Also check against provider-specific model strings
  const modelStrings = getModelStrings()
  for (const [key, providerModel] of Object.entries(modelStrings)) {
    if (providerModel === baseModel) {
      const displayName = CANONICAL_TO_DISPLAY_NAME.get(key) ?? keyToDisplayName(key)
      return has1m ? `${displayName} (1M context)` : displayName
    }
  }

  return null
}

function maskModelCodename(baseName: string): string {
  // Mask only the first dash-separated segment (the codename), preserve the rest
  // e.g. capybara-v2-fast → cap*****-v2-fast
  const [codename = '', ...rest] = baseName.split('-')
  const masked =
    codename.slice(0, 3) + '*'.repeat(Math.max(0, codename.length - 3))
  return [masked, ...rest].join('-')
}

export function renderModelName(model: ModelName): string {
  const publicName = getPublicModelDisplayName(model)
  if (publicName) {
    return publicName
  }
  if (process.env.USER_TYPE === 'ant') {
    const resolved = parseUserSpecifiedModel(model)
    const antModel = resolveAntModel(model)
    if (antModel) {
      const baseName = antModel.model.replace(/\[1m\]$/i, '')
      const masked = maskModelCodename(baseName)
      const suffix = has1mContext(resolved) ? '[1m]' : ''
      return masked + suffix
    }
    if (resolved !== model) {
      return `${model} (${resolved})`
    }
    return resolved
  }
  return model
}

/**
 * Returns a safe author name for public display (e.g., in git commit trailers).
 * Returns "Hawk {ModelName}" for publicly known models, or "Hawk ({model})"
 * for unknown/internal models so the exact model name is preserved.
 *
 * @param model The full model name
 * @returns "Hawk {ModelName}" for public models, or "Hawk ({model})" for non-public models
 */
export function getPublicModelName(model: ModelName): string {
  const publicName = getPublicModelDisplayName(model)
  if (publicName) {
    return `Hawk ${publicName}`
  }
  return `Hawk (${model})`
}

/**
 * Returns a full model name for use in this session, possibly after resolving
 * a model alias.
 *
 * This function intentionally does not support version numbers to align with
 * the model switcher.
 *
 * Supports [1m] suffix on any model alias (e.g., haiku[1m], sonnet[1m]) to enable
 * 1M context window without requiring each variant to be in MODEL_ALIASES.
 *
 * @param modelInput The model alias or name provided by the user.
 */
export function parseUserSpecifiedModel(
  modelInput: ModelName | ModelAlias,
): ModelName {
  const modelInputTrimmed = modelInput.trim()
  const normalizedModel = modelInputTrimmed.toLowerCase()

  const has1mTag = has1mContext(normalizedModel)
  const modelString = has1mTag
    ? normalizedModel.replace(/\[1m]$/i, '').trim()
    : normalizedModel

  if (isModelAlias(modelString)) {
    switch (modelString) {
      case 'opusplan':
        return getDefaultSonnetModel() + (has1mTag ? '[1m]' : '') // Sonnet is default, Opus in plan mode
      case 'sonnet':
        return getDefaultSonnetModel() + (has1mTag ? '[1m]' : '')
      case 'haiku':
        return getDefaultHaikuModel() + (has1mTag ? '[1m]' : '')
      case 'opus':
        return getDefaultOpusModel() + (has1mTag ? '[1m]' : '')
      case 'best':
        return getBestModel()
      default:
    }
  }

  // Opus 4/4.1 are no longer available on the first-party API (same as
  // Hawk.ai) — silently remap to the current Opus default. The 'opus'
  // alias already resolves to 4.6, so the only users on these explicit
  // strings pinned them in settings/env/--model/SDK before 4.5 launched.
  // 3P providers may not yet have 4.6 capacity, so pass through unchanged.
  if (
    getAPIProvider() === 'anthropic' &&
    isLegacyOpusFirstParty(modelString) &&
    isLegacyModelRemapEnabled()
  ) {
    return getDefaultOpusModel() + (has1mTag ? '[1m]' : '')
  }

  if (process.env.USER_TYPE === 'ant') {
    const has1mAntTag = has1mContext(normalizedModel)
    const baseAntModel = normalizedModel.replace(/\[1m]$/i, '').trim()

    const antModel = resolveAntModel(baseAntModel)
    if (antModel) {
      const suffix = has1mAntTag ? '[1m]' : ''
      return antModel.model + suffix
    }

    // Fall through to the alias string if we cannot load the config. The API calls
    // will fail with this string, but we should hear about it through feedback and
    // can tell the user to restart/wait for flag cache refresh to get the latest values.
  }

  // Preserve original case for custom model names (e.g., Azure Foundry deployment IDs)
  // Only strip [1m] suffix if present, maintaining case of the base model
  if (has1mTag) {
    return modelInputTrimmed.replace(/\[1m\]$/i, '').trim() + '[1m]'
  }
  return modelInputTrimmed
}

/**
 * Resolves a skill's `model:` frontmatter against the current model, carrying
 * the `[1m]` suffix over when the target family supports it.
 *
 * A skill author writing `model: opus` means "use opus-class reasoning" — not
 * "downgrade to 200K". If the user is on opus[1m] at 230K tokens and invokes a
 * skill with `model: opus`, passing the bare alias through drops the effective
 * context window from 1M to 200K, which trips autocompact at 23% apparent usage
 * and surfaces "Context limit reached" even though nothing overflowed.
 *
 * We only carry [1m] when the target actually supports it (sonnet/opus). A skill
 * with `model: haiku` on a 1M session still downgrades — haiku has no 1M variant,
 * so the autocompact that follows is correct. Skills that already specify [1m]
 * are left untouched.
 */
export function resolveSkillModelOverride(
  skillModel: string,
  currentModel: string,
): string {
  if (has1mContext(skillModel) || !has1mContext(currentModel)) {
    return skillModel
  }
  // modelSupports1M matches on canonical IDs ('claude-opus-4-6', 'claude-sonnet-4');
  // a bare 'opus' alias falls through getCanonicalName unmatched. Resolve first.
  if (modelSupports1M(parseUserSpecifiedModel(skillModel))) {
    return skillModel + '[1m]'
  }
  return skillModel
}

const LEGACY_OPUS_FIRSTPARTY = [
  'claude-opus-4-20250514',
  'claude-opus-4-1-20250805',
  'claude-opus-4-0',
  'claude-opus-4-1',
]

function isLegacyOpusFirstParty(model: string): boolean {
  return LEGACY_OPUS_FIRSTPARTY.includes(model)
}

/**
 * Opt-out for the legacy Opus 4.0/4.1 → current Opus remap.
 */
export function isLegacyModelRemapEnabled(): boolean {
  return !isEnvTruthy(process.env.HAWK_CODE_DISABLE_LEGACY_MODEL_REMAP)
}

export function modelDisplayString(model: ModelSetting): string {
  if (model === null) {
    if (process.env.USER_TYPE === 'ant') {
      return `Default for Ants (${renderDefaultModelSetting(getDefaultMainLoopModelSetting())})`
    } else if (isHawkAISubscriber()) {
      return `Default (${getHawkAiUserDefaultModelDescription()})`
    }
    return `Default (${getDefaultMainLoopModel()})`
  }
  const resolvedModel = parseUserSpecifiedModel(model)
  return model === resolvedModel ? resolvedModel : `${model} (${resolvedModel})`
}

/**
 * Returns a marketing-friendly name for a model.
 *
 * Dynamic: derives names from ALL_MODEL_CONFIGS model keys.
 * New models are automatically included without code changes.
 */
export function getMarketingNameForModel(modelId: string): string | undefined {
  const has1m = modelId.toLowerCase().includes('[1m]')
  const canonical = getCanonicalName(modelId)

  // Sort by shortName length descending so more specific matches take priority
  // (e.g. "claude-opus-4-6" before "claude-opus-4")
  const sortedEntries = [...CANONICAL_TO_SHORT_NAME.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  )

  for (const [canonicalId, shortName] of sortedEntries) {
    // Exact match or starts-with match at segment boundary
    if (
      canonical === shortName ||
      canonical === canonicalId ||
      canonical.startsWith(shortName + '-') ||
      canonical.startsWith(canonicalId + '-')
    ) {
      const displayName = CANONICAL_TO_DISPLAY_NAME.get(canonicalId)
        ?? CANONICAL_TO_DISPLAY_NAME.get(shortName)
        ?? keyToDisplayName(canonicalId.replace('claude-', ''))
      return has1m ? `${displayName} (with 1M context)` : displayName
    }
  }

  return undefined
}

export function normalizeModelStringForAPI(model: string): string {
  return model.replace(/\[(1|2)m\]/gi, '')
}
