import { expect, test } from 'bun:test'
import { applyProviderConfigToEnv, type ProviderConfig } from '../../providerConfig.ts'

test('openrouter provider mirrors credentials/model/base url into openai vars', () => {
  const config: ProviderConfig = {
    active_provider: 'openrouter',
    openrouter_api_key: 'or-key',
    openrouter_model: 'openai/gpt-4o-mini',
    openrouter_base_url: 'https://openrouter.ai/api/v1',
  }

  const env: NodeJS.ProcessEnv = {}
  const provider = applyProviderConfigToEnv(env, config)

  expect(provider).toBe('openrouter')
  expect(env.OPENROUTER_API_KEY).toBe('or-key')
  expect(env.OPENROUTER_MODEL).toBe('openai/gpt-4o-mini')
  expect(env.OPENROUTER_BASE_URL).toBe('https://openrouter.ai/api/v1')
  expect(env.OPENAI_API_KEY).toBe('or-key')
  expect(env.OPENAI_MODEL).toBe('openai/gpt-4o-mini')
  expect(env.OPENAI_BASE_URL).toBe('https://openrouter.ai/api/v1')
})
