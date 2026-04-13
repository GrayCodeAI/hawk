import { getProviderDefaultModel } from '../../model/configs.js'
import { PROVIDER_DEFAULT_BASE_URLS } from '../../providerRegistry.js'
import { asNonEmptyString, setEnvValue } from '../helpers.js'
import type { ProviderEnvApplyContext } from './types.js'

export function applyOpenAIProviderEnv({
  env,
  config,
  activeModel,
  overwrite,
}: ProviderEnvApplyContext): void {
  setEnvValue(env, 'OPENAI_API_KEY', asNonEmptyString(config.openai_api_key), overwrite)
  setEnvValue(env, 'OPENAI_MODEL', activeModel ?? getProviderDefaultModel('openai'), overwrite)
  setEnvValue(
    env,
    'OPENAI_BASE_URL',
    asNonEmptyString(config.openai_base_url) ?? PROVIDER_DEFAULT_BASE_URLS.openai,
    overwrite,
  )
}
