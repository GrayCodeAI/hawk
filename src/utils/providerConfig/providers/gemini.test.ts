import { expect, test } from 'bun:test'
import { applyProviderConfigToEnv, type ProviderConfig } from '../../providerConfig.ts'

test('gemini provider mirrors credentials/model/base url into openai vars', () => {
  const config: ProviderConfig = {
    active_provider: 'gemini',
    gemini_api_key: 'gem-key',
    gemini_model: 'gemini-2.5-pro',
    gemini_base_url: 'https://generativelanguage.googleapis.com/v1beta/openai',
  }

  const env: NodeJS.ProcessEnv = {}
  const provider = applyProviderConfigToEnv(env, config)

  expect(provider).toBe('gemini')
  expect(env.GEMINI_API_KEY).toBe('gem-key')
  expect(env.GEMINI_MODEL).toBe('gemini-2.5-pro')
  expect(env.GEMINI_BASE_URL).toBe('https://generativelanguage.googleapis.com/v1beta/openai')
  expect(env.OPENAI_API_KEY).toBe('gem-key')
  expect(env.OPENAI_MODEL).toBe('gemini-2.5-pro')
  expect(env.OPENAI_BASE_URL).toBe('https://generativelanguage.googleapis.com/v1beta/openai')
})
