import type { APIProvider } from '@hawk/eyrie'
import {
  // Config I/O
  loadProviderConfig as eyrieLoadProviderConfig,
  saveProviderConfig as eyrieSaveProviderConfig,
  getProviderConfigPath as eyrieGetProviderConfigPath,
  // Provider detection
  defaultProviderFromConfig as eyrieDefaultProviderFromConfig,
  isProviderConfigured as eyrieIsProviderConfigured,
  getProviderActiveModel as eyrieGetProviderActiveModel,
  applyProviderConfigToEnv as eyrieApplyProviderConfigToEnv,
  // Helpers
  asNonEmptyString,
  getProviderModel,
  getProviderApiKey,
  getProviderBaseUrlKey,
  getProviderModelKey,
  PROVIDER_CONFIG_KEYS,
  validateApiKey,
  validateBaseUrl,
} from '@hawk/eyrie'
import type { ProviderProfile } from './providerRegistry.js'
export type { ProviderProfile } from './providerRegistry.js'

// Re-export helpers from eyrie for backward compatibility
export {
  asNonEmptyString,
  getProviderModel,
  getProviderApiKey,
  getProviderBaseUrlKey,
  getProviderModelKey,
  PROVIDER_CONFIG_KEYS,
  validateApiKey,
  validateBaseUrl,
} from '@hawk/eyrie'

// ProviderConfig type is compatible between hawk and eyrie
export type ProviderConfig = import('@hawk/eyrie').ProviderConfig

// Type adapter: ProviderProfile -> APIProvider
function toAPIProvider(provider: ProviderProfile): APIProvider {
  return provider as APIProvider
}

/**
 * Get the path to the provider config file.
 * Delegates to eyrie for the actual implementation.
 */
export function getProviderConfigPath(): string {
  return eyrieGetProviderConfigPath()
}

/**
 * Loads the provider config from disk.
 * Delegates to eyrie for the actual implementation.
 */
export function loadProviderConfig(path?: string): ProviderConfig | null {
  return eyrieLoadProviderConfig(path)
}

/**
 * Saves the provider config to disk.
 * Delegates to eyrie for the actual implementation.
 */
export function saveProviderConfig(config: ProviderConfig, path?: string): void {
  eyrieSaveProviderConfig(config, path)
}

/**
 * Checks if a provider has valid configuration.
 * Delegates to eyrie for the actual implementation.
 */
export function isProviderConfigured(config: ProviderConfig, provider: ProviderProfile): boolean {
  return eyrieIsProviderConfigured(config, toAPIProvider(provider))
}

/**
 * Determines the default provider from config.
 * Delegates to eyrie for the actual implementation.
 */
export function defaultProviderFromConfig(config: ProviderConfig | null): ProviderProfile | null {
  const eyrieProvider = eyrieDefaultProviderFromConfig(config)
  return eyrieProvider as ProviderProfile | null
}

/**
 * Gets the active model for a specific provider from config.
 * Delegates to eyrie for the actual implementation.
 */
export function getProviderActiveModel(
  config: ProviderConfig,
  provider: ProviderProfile,
): string | undefined {
  return eyrieGetProviderActiveModel(config, toAPIProvider(provider))
}

/**
 * Applies the full provider configuration to environment variables.
 * Delegates to eyrie for the actual implementation.
 */
export function applyProviderConfigToEnv(
  env: NodeJS.ProcessEnv = process.env,
  config: ProviderConfig | null = loadProviderConfig(),
  options?: {
    overwrite?: boolean
    skipValidation?: boolean
  },
): ProviderProfile | null {
  const eyrieProvider = eyrieApplyProviderConfigToEnv(env, config, options)
  return eyrieProvider as ProviderProfile | null
}
