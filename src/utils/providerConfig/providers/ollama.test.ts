import { expect, test } from 'bun:test'
import { applyProviderConfigToEnv, type ProviderConfig } from '../../providerConfig.ts'

test('ollama provider normalizes base url and sets model in openai vars', () => {
  const config: ProviderConfig = {
    active_provider: 'ollama',
    ollama_base_url: 'http://localhost:11434',
    ollama_model: 'llama3.2:3b',
  }

  const env: NodeJS.ProcessEnv = {}
  const provider = applyProviderConfigToEnv(env, config)

  expect(provider).toBe('ollama')
  expect(env.OPENAI_MODEL).toBe('llama3.2:3b')
  expect(env.OPENAI_BASE_URL).toBe('http://localhost:11434/v1')
})
