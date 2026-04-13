import type { ProviderProfile } from '../../providerRegistry.js'
import type { ProviderEnvApplyContext } from './types.js'
import { applyAnthropicProviderEnv } from './anthropic.js'
import { applyCanopyWaveProviderEnv } from './canopywave.js'
import { applyGeminiProviderEnv } from './gemini.js'
import { applyGrokProviderEnv } from './grok.js'
import { applyOllamaProviderEnv } from './ollama.js'
import { applyOpenAIProviderEnv } from './openai.js'
import { applyOpenRouterProviderEnv } from './openrouter.js'

export function applyProviderEnv(
  provider: ProviderProfile,
  context: ProviderEnvApplyContext,
): void {
  switch (provider) {
    case 'anthropic':
      applyAnthropicProviderEnv(context)
      return
    case 'openai':
      applyOpenAIProviderEnv(context)
      return
    case 'canopywave':
      applyCanopyWaveProviderEnv(context)
      return
    case 'openrouter':
      applyOpenRouterProviderEnv(context)
      return
    case 'grok':
      applyGrokProviderEnv(context)
      return
    case 'gemini':
      applyGeminiProviderEnv(context)
      return
    case 'ollama':
      applyOllamaProviderEnv(context)
      return
  }
}
