import { expect, test } from 'bun:test'
import { applyProviderConfigToEnv, type ProviderConfig } from '../../providerConfig.ts'

test('anthropic provider maps api key/model/base url/version to env', () => {
  const config: ProviderConfig = {
    active_provider: 'anthropic',
    anthropic_api_key: 'anthropic-key',
    anthropic_model: 'claude-sonnet-4-6',
    anthropic_base_url: 'https://api.anthropic.com/v1',
    anthropic_version: '2023-06-01',
  }

  const env: NodeJS.ProcessEnv = {}
  const provider = applyProviderConfigToEnv(env, config)

  expect(provider).toBe('anthropic')
  expect(env.ANTHROPIC_API_KEY).toBe('anthropic-key')
  expect(env.ANTHROPIC_MODEL).toBe('claude-sonnet-4-6')
  expect(env.ANTHROPIC_BASE_URL).toBe('https://api.anthropic.com/v1')
  expect(env.ANTHROPIC_VERSION).toBe('2023-06-01')
})
