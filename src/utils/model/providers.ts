import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../../services/analytics/index.js'
import { detectProvider } from '@hawk/eyrie'
import {
  defaultProviderFromConfig,
  loadProviderConfig,
} from '../providerConfig.js'

export type APIProvider = 'anthropic' | 'openai' | 'grok' | 'gemini' | 'ollama'

export function getAPIProvider(): APIProvider {
  const configuredProvider = defaultProviderFromConfig(loadProviderConfig())
  if (configuredProvider) {
    return configuredProvider
  }
  return detectProvider()
}

export function getAPIProviderForStatsig(): AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  return getAPIProvider() as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
}

export function isFirstPartyGrayCodeBaseUrl(): boolean {
  const baseUrl = process.env.ANTHROPIC_BASE_URL
  if (!baseUrl) return true
  try {
    return new URL(baseUrl).host === 'api.anthropic.com'
  } catch {
    return false
  }
}
