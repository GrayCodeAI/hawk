import { expect, test } from 'bun:test'
import { applyProviderConfigToEnv, type ProviderConfig } from '../../providerConfig.ts'

test('grok provider uses xai fallback key/base url for openai compatibility vars', () => {
  const config: ProviderConfig = {
    active_provider: 'grok',
    xai_api_key: 'xai-key',
    xai_base_url: 'https://api.x.ai/v1',
    grok_model: 'grok-3-mini-beta',
  }

  const env: NodeJS.ProcessEnv = {}
  const provider = applyProviderConfigToEnv(env, config)

  expect(provider).toBe('grok')
  expect(env.XAI_API_KEY).toBe('xai-key')
  expect(env.GROK_MODEL).toBe('grok-3-mini-beta')
  expect(env.GROK_BASE_URL).toBe('https://api.x.ai/v1')
  expect(env.OPENAI_API_KEY).toBe('xai-key')
  expect(env.OPENAI_MODEL).toBe('grok-3-mini-beta')
  expect(env.OPENAI_BASE_URL).toBe('https://api.x.ai/v1')
})
