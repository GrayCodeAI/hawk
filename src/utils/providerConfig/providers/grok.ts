import { getProviderDefaultModel } from '../../model/configs.js'
import { PROVIDER_DEFAULT_BASE_URLS } from '../../providerRegistry.js'
import { asNonEmptyString, setEnvValue } from '../helpers.js'
import type { ProviderEnvApplyContext } from './types.js'

export function applyGrokProviderEnv({
  env,
  config,
  activeModel,
  overwrite,
}: ProviderEnvApplyContext): void {
  const grokApiKey =
    asNonEmptyString(config.grok_api_key) ??
    asNonEmptyString(config.xai_api_key)
  const grokBaseUrl =
    asNonEmptyString(config.grok_base_url) ??
    asNonEmptyString(config.xai_base_url) ??
    PROVIDER_DEFAULT_BASE_URLS.grok
  const grokModel = activeModel ?? getProviderDefaultModel('grok')

  setEnvValue(env, 'GROK_API_KEY', asNonEmptyString(config.grok_api_key), overwrite)
  setEnvValue(env, 'XAI_API_KEY', asNonEmptyString(config.xai_api_key), overwrite)
  setEnvValue(env, 'GROK_MODEL', grokModel, overwrite)
  setEnvValue(env, 'GROK_BASE_URL', grokBaseUrl, overwrite)

  // OpenAI-compatible shim compatibility.
  setEnvValue(env, 'OPENAI_API_KEY', grokApiKey, overwrite)
  setEnvValue(env, 'OPENAI_MODEL', grokModel, overwrite)
  setEnvValue(env, 'OPENAI_BASE_URL', grokBaseUrl, overwrite)
}
