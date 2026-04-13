import { getProviderDefaultModel } from '../../model/configs.js'
import { PROVIDER_DEFAULT_BASE_URLS } from '../../providerRegistry.js'
import { asNonEmptyString, setEnvValue } from '../helpers.js'
import type { ProviderEnvApplyContext } from './types.js'

export function applyCanopyWaveProviderEnv({
  env,
  config,
  activeModel,
  overwrite,
}: ProviderEnvApplyContext): void {
  const canopywaveApiKey = asNonEmptyString(config.canopywave_api_key)
  const canopywaveBaseUrl =
    asNonEmptyString(config.canopywave_base_url) ??
    PROVIDER_DEFAULT_BASE_URLS.canopywave
  const canopywaveModel = activeModel ?? getProviderDefaultModel('canopywave')

  setEnvValue(env, 'CANOPYWAVE_API_KEY', canopywaveApiKey, overwrite)
  setEnvValue(env, 'CANOPYWAVE_MODEL', canopywaveModel, overwrite)
  setEnvValue(env, 'CANOPYWAVE_BASE_URL', canopywaveBaseUrl, overwrite)

  // OpenAI-compatible shim compatibility.
  setEnvValue(env, 'OPENAI_API_KEY', canopywaveApiKey, overwrite)
  setEnvValue(env, 'OPENAI_MODEL', canopywaveModel, overwrite)
  setEnvValue(env, 'OPENAI_BASE_URL', canopywaveBaseUrl, overwrite)
}
