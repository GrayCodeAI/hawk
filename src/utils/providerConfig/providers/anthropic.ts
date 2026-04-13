import { getPreferredProviderModel } from '../../model/configs.js'
import { asNonEmptyString, setEnvValue } from '../helpers.js'
import type { ProviderEnvApplyContext } from './types.js'

export function applyAnthropicProviderEnv({
  env,
  config,
  activeModel,
  overwrite,
}: ProviderEnvApplyContext): void {
  setEnvValue(env, 'ANTHROPIC_API_KEY', asNonEmptyString(config.anthropic_api_key), overwrite)
  setEnvValue(
    env,
    'ANTHROPIC_MODEL',
    activeModel ?? getPreferredProviderModel('anthropic', 'sonnet'),
    overwrite,
  )
  setEnvValue(env, 'ANTHROPIC_BASE_URL', asNonEmptyString(config.anthropic_base_url), overwrite)
  setEnvValue(env, 'ANTHROPIC_VERSION', asNonEmptyString(config.anthropic_version), overwrite)
}
