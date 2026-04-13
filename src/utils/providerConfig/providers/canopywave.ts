import { getProviderDefaultModel } from '../../model/configs.js'
import { PROVIDER_DEFAULT_BASE_URLS } from '../../providerRegistry.js'
import { applyOpenAICompatibleProvider, asNonEmptyString } from '../helpers.js'
import type { ProviderEnvApplyContext } from './types.js'

export function applyCanopyWaveProviderEnv({
  env,
  config,
  activeModel,
  overwrite,
}: ProviderEnvApplyContext): void {
  const canopywaveApiKey = asNonEmptyString(config.canopywave_api_key)
  const canopywaveBaseUrl =
    asNonEmptyString(config.canopywave_base_url) ?? PROVIDER_DEFAULT_BASE_URLS.canopywave
  const canopywaveModel = activeModel ?? getProviderDefaultModel('canopywave')

  applyOpenAICompatibleProvider(
    env,
    'CANOPYWAVE',
    canopywaveApiKey,
    canopywaveModel,
    canopywaveBaseUrl,
    overwrite,
  )
}
