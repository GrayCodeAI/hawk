import { getProviderDefaultModel } from '../../model/configs.js'
import { PROVIDER_DEFAULT_BASE_URLS } from '../../providerRegistry.js'
import { applyOpenAICompatibleProvider, asNonEmptyString } from '../helpers.js'
import type { ProviderEnvApplyContext } from './types.js'

export function applyGeminiProviderEnv({
  env,
  config,
  activeModel,
  overwrite,
}: ProviderEnvApplyContext): void {
  const geminiApiKey = asNonEmptyString(config.gemini_api_key)
  const geminiBaseUrl =
    asNonEmptyString(config.gemini_base_url) ?? PROVIDER_DEFAULT_BASE_URLS.gemini
  const geminiModel = activeModel ?? getProviderDefaultModel('gemini')

  applyOpenAICompatibleProvider(env, 'GEMINI', geminiApiKey, geminiModel, geminiBaseUrl, overwrite)
}
