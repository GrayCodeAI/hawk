import { getProviderDefaultModel } from '../../model/configs.js'
import { PROVIDER_DEFAULT_BASE_URLS } from '../../providerRegistry.js'
import { applyOpenAICompatibleProvider, asNonEmptyString } from '../helpers.js'
import type { ProviderEnvApplyContext } from './types.js'

export function applyOpenCodeGoProviderEnv({
  env,
  config,
  activeModel,
  overwrite,
}: ProviderEnvApplyContext): void {
  const opencodegoApiKey = asNonEmptyString(config.opencodego_api_key)
  const opencodegoBaseUrl =
    asNonEmptyString(config.opencodego_base_url) ?? PROVIDER_DEFAULT_BASE_URLS.opencodego
  const opencodegoModel = activeModel ?? getProviderDefaultModel('opencodego')

  applyOpenAICompatibleProvider(
    env,
    'OPENCODEGO',
    opencodegoApiKey,
    opencodegoModel,
    opencodegoBaseUrl,
    overwrite,
  )
}
