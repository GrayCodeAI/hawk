import { expect, test } from 'bun:test'
import { getProviderDefaultModel } from '../../model/configs.ts'
import { PROVIDER_DEFAULT_BASE_URLS } from '../../providerRegistry.ts'
import { applyProviderConfigToEnv, type ProviderConfig } from '../../providerConfig.ts'

test('openai provider sets default base url and model when omitted', () => {
  const config: ProviderConfig = {
    active_provider: 'openai',
    openai_api_key: 'openai-key',
  }

  const env: NodeJS.ProcessEnv = {}
  const provider = applyProviderConfigToEnv(env, config)

  expect(provider).toBe('openai')
  expect(env.OPENAI_API_KEY).toBe('openai-key')
  expect(env.OPENAI_MODEL).toBe(getProviderDefaultModel('openai'))
  expect(env.OPENAI_BASE_URL).toBe(PROVIDER_DEFAULT_BASE_URLS.openai)
})
