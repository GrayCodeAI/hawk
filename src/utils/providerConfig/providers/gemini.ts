import { getProviderDefaultModel } from '../../model/configs.js'
import { PROVIDER_DEFAULT_BASE_URLS } from '../../providerRegistry.js'
import { asNonEmptyString, setEnvValue } from '../helpers.js'
import type { ProviderEnvApplyContext } from './types.js'

export function applyGeminiProviderEnv({
  env,
  config,
  activeModel,
  overwrite,
}: ProviderEnvApplyContext): void {
  const geminiApiKey = asNonEmptyString(config.gemini_api_key)
  const geminiBaseUrl =
    asNonEmptyString(config.gemini_base_url) ??
    PROVIDER_DEFAULT_BASE_URLS.gemini
  const geminiModel = activeModel ?? getProviderDefaultModel('gemini')

  setEnvValue(env, 'GEMINI_API_KEY', geminiApiKey, overwrite)
  setEnvValue(env, 'GEMINI_MODEL', geminiModel, overwrite)
  setEnvValue(env, 'GEMINI_BASE_URL', geminiBaseUrl, overwrite)

  // OpenAI-compatible shim compatibility.
  setEnvValue(env, 'OPENAI_API_KEY', geminiApiKey, overwrite)
  setEnvValue(env, 'OPENAI_MODEL', geminiModel, overwrite)
  setEnvValue(env, 'OPENAI_BASE_URL', geminiBaseUrl, overwrite)
}
