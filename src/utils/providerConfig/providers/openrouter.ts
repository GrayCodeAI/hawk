import { getProviderDefaultModel } from '../../model/configs.js'
import { PROVIDER_DEFAULT_BASE_URLS } from '../../providerRegistry.js'
import { asNonEmptyString, setEnvValue } from '../helpers.js'
import type { ProviderEnvApplyContext } from './types.js'

export function applyOpenRouterProviderEnv({
  env,
  config,
  activeModel,
  overwrite,
}: ProviderEnvApplyContext): void {
  const openrouterApiKey = asNonEmptyString(config.openrouter_api_key)
  const openrouterBaseUrl =
    asNonEmptyString(config.openrouter_base_url) ??
    PROVIDER_DEFAULT_BASE_URLS.openrouter
  const openrouterModel = activeModel ?? getProviderDefaultModel('openrouter')

  setEnvValue(env, 'OPENROUTER_API_KEY', openrouterApiKey, overwrite)
  setEnvValue(env, 'OPENROUTER_MODEL', openrouterModel, overwrite)
  setEnvValue(env, 'OPENROUTER_BASE_URL', openrouterBaseUrl, overwrite)

  // OpenAI-compatible shim compatibility.
  setEnvValue(env, 'OPENAI_API_KEY', openrouterApiKey, overwrite)
  setEnvValue(env, 'OPENAI_MODEL', openrouterModel, overwrite)
  setEnvValue(env, 'OPENAI_BASE_URL', openrouterBaseUrl, overwrite)
}
