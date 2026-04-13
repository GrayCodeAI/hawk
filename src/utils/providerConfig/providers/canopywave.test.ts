import { expect, test } from 'bun:test'
import { applyProviderConfigToEnv, type ProviderConfig } from '../../providerConfig.ts'

test('canopywave provider mirrors credentials/model/base url into openai vars', () => {
  const config: ProviderConfig = {
    active_provider: 'canopywave',
    canopywave_api_key: 'cw-key',
    canopywave_model: 'zai/glm-4.6',
    canopywave_base_url: 'https://inference.canopywave.io/v1',
  }

  const env: NodeJS.ProcessEnv = {}
  const provider = applyProviderConfigToEnv(env, config)

  expect(provider).toBe('canopywave')
  expect(env.CANOPYWAVE_API_KEY).toBe('cw-key')
  expect(env.CANOPYWAVE_MODEL).toBe('zai/glm-4.6')
  expect(env.CANOPYWAVE_BASE_URL).toBe('https://inference.canopywave.io/v1')
  expect(env.OPENAI_API_KEY).toBe('cw-key')
  expect(env.OPENAI_MODEL).toBe('zai/glm-4.6')
  expect(env.OPENAI_BASE_URL).toBe('https://inference.canopywave.io/v1')
})
