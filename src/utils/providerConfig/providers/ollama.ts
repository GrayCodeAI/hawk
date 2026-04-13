import { asNonEmptyString, normalizeOllamaOpenAIBaseUrl, setEnvValue } from '../helpers.js'
import type { ProviderEnvApplyContext } from './types.js'

export function applyOllamaProviderEnv({
  env,
  config,
  activeModel,
  overwrite,
}: ProviderEnvApplyContext): void {
  setEnvValue(env, 'OPENAI_MODEL', activeModel ?? 'llama3.1:8b', overwrite)
  setEnvValue(
    env,
    'OPENAI_BASE_URL',
    normalizeOllamaOpenAIBaseUrl(asNonEmptyString(config.ollama_base_url)) ??
      'http://localhost:11434/v1',
    overwrite,
  )
}
