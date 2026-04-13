import { getProviderDefaultModel } from '../../model/configs.js'
import { PROVIDER_DEFAULT_BASE_URLS } from '../../providerRegistry.js'
import { applyOpenAICompatibleProvider, asNonEmptyString } from '../helpers.js'
import type { ProviderEnvApplyContext } from './types.js'

export function applyOpenRouterProviderEnv({
  env,
  config,
  activeModel,
  overwrite,
}: ProviderEnvApplyContext): void {
  const openrouterApiKey = asNonEmptyString(config.openrouter_api_key)
  const openrouterBaseUrl =
    asNonEmptyString(config.openrouter_base_url) ?? PROVIDER_DEFAULT_BASE_URLS.openrouter
  const openrouterModel = activeModel ?? getProviderDefaultModel('openrouter')

  applyOpenAICompatibleProvider(
    env,
    'OPENROUTER',
    openrouterApiKey,
    openrouterModel,
    openrouterBaseUrl,
    overwrite,
  )
}
