import memoize from 'lodash-es/memoize.js'
import { homedir } from 'os'
import { join } from 'path'
import { memoizeWithTTL } from './memoize.js'
import { SHORT_TTL_MS } from '../constants/numbers.js'

// Memoized: 150+ callers, many on hot paths. Keyed off HAWK_CONFIG_DIR so
// tests that change the env var get a fresh value without explicit cache.clear.
export const getHawkConfigHomeDir = memoize(
  (): string => {
    return (
      process.env.HAWK_CONFIG_DIR ?? join(homedir(), '.hawk')
    ).normalize('NFC')
  },
  () => process.env.HAWK_CONFIG_DIR,
)

// TTL variant for functions that may change during runtime
// Use for cached computations that might need to refresh
export const getHawkConfigHomeDirWithTTL = memoizeWithTTL(
  (): string => {
    return (
      process.env.HAWK_CONFIG_DIR ?? join(homedir(), '.hawk')
    ).normalize('NFC')
  },
  SHORT_TTL_MS,
)

export function getTeamsDir(): string {
  return join(getHawkConfigHomeDir(), 'teams')
}

/**
 * Check if NODE_OPTIONS contains a specific flag.
 * Splits on whitespace and checks for exact match to avoid false positives.
 */
export function hasNodeOption(flag: string): boolean {
  const nodeOptions = process.env.NODE_OPTIONS
  if (!nodeOptions) {
    return false
  }
  return nodeOptions.split(/\s+/).includes(flag)
}

export function isEnvTruthy(envVar: string | boolean | undefined): boolean {
  if (!envVar) return false
  if (typeof envVar === 'boolean') return envVar
  const normalizedValue = envVar.toLowerCase().trim()
  return ['1', 'true', 'yes', 'on'].includes(normalizedValue)
}

export function isEnvDefinedFalsy(
  envVar: string | boolean | undefined,
): boolean {
  if (envVar === undefined) return false
  if (typeof envVar === 'boolean') return !envVar
  if (!envVar) return false
  const normalizedValue = envVar.toLowerCase().trim()
  return ['0', 'false', 'no', 'off'].includes(normalizedValue)
}

function hasNonEmptyEnv(...keys: string[]): boolean {
  return keys.some(key => {
    const value = process.env[key]
    return typeof value === 'string' && value.trim().length > 0
  })
}

export function isProviderApiModeEnabled(): boolean {
  return (
    hasNonEmptyEnv(
      'OPENAI_API_KEY',
      'OPENROUTER_API_KEY',
      'OPENAI_MODEL',
      'OPENAI_BASE_URL',
      'OPENAI_API_BASE',
      'OPENROUTER_MODEL',
      'OPENROUTER_BASE_URL',
      'GEMINI_API_KEY',
      'GEMINI_MODEL',
      'GEMINI_BASE_URL',
      'ANTHROPIC_API_KEY',
      'ANTHROPIC_MODEL',
      'ANTHROPIC_BASE_URL',
      'GROK_API_KEY',
      'XAI_API_KEY',
      'GROK_MODEL',
      'XAI_MODEL',
      'GROK_BASE_URL',
      'XAI_BASE_URL',
    )
  )
}

/**
 * --bare / HAWK_CODE_SIMPLE — skip hooks, LSP, plugin sync, skill dir-walk,
 * attribution, background prefetches, and ALL keychain/credential reads.
 * Auth is strictly GRAYCODE_API_KEY env or apiKeyHelper from --settings.
 * Explicit CLI flags (--plugin-dir, --add-dir, --mcp-config) still honored.
 * ~30 gates across the codebase.
 *
 * Checks argv directly (in addition to the env var) because several gates
 * run before main.tsx's action handler sets HAWK_CODE_SIMPLE=1 from --bare
 * — notably startKeychainPrefetch() at main.tsx top-level.
 */
export function isBareMode(): boolean {
  return (
    isEnvTruthy(process.env.HAWK_CODE_SIMPLE) ||
    process.argv.includes('--bare')
  )
}

/**
 * Parses an array of environment variable strings into a key-value object
 * @param envVars Array of strings in KEY=VALUE format
 * @returns Object with key-value pairs
 */
export function parseEnvVars(
  rawEnvArgs: string[] | undefined,
): Record<string, string> {
  const parsedEnv: Record<string, string> = {}

  // Parse individual env vars
  if (rawEnvArgs) {
    for (const envStr of rawEnvArgs) {
      const [key, ...valueParts] = envStr.split('=')
      if (!key || valueParts.length === 0) {
        throw new Error(
          `Invalid environment variable format: ${envStr}, environment variables should be added as: -e KEY1=value1 -e KEY2=value2`,
        )
      }
      parsedEnv[key] = valueParts.join('=')
    }
  }
  return parsedEnv
}

/**
 * Get the AWS region with fallback to default
 * Matches the GrayCode Bedrock SDK's region behavior
 */
export function getAWSRegion(): string {
  return process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1'
}

/**
 * Get the default Vertex AI region
 */
export function getDefaultVertexRegion(): string {
  return process.env.CLOUD_ML_REGION || 'us-east5'
}

/**
 * Check if bash commands should maintain project working directory (reset to original after each command)
 * @returns true if HAWK_BASH_MAINTAIN_PROJECT_WORKING_DIR is set to a truthy value
 */
export function shouldMaintainProjectWorkingDir(): boolean {
  return isEnvTruthy(process.env.HAWK_BASH_MAINTAIN_PROJECT_WORKING_DIR)
}

/**
 * Check if running on Homespace (ant-internal cloud environment)
 */
export function isRunningOnHomespace(): boolean {
  return (
    process.env.USER_TYPE === 'ant' &&
    isEnvTruthy(process.env.COO_RUNNING_ON_HOMESPACE)
  )
}

/**
 * Conservative check for whether Hawk is running inside a protected
 * (privileged or ASL3+) COO namespace or cluster.
 *
 * Conservative means: when signals are ambiguous, assume protected. We would
 * rather over-report protected usage than miss it. Unprotected environments
 * are homespace, namespaces on the open allowlist, and no k8s/COO signals
 * at all (laptop/local dev).
 *
 * Used for telemetry to measure auto-mode usage in sensitive environments.
 */
export function isInProtectedNamespace(): boolean {
  // USER_TYPE is build-time --define'd; in external builds this block is
  // DCE'd so the require() and namespace allowlist never appear in the bundle.
  if (process.env.USER_TYPE === 'ant') {
    /* eslint-disable @typescript-eslint/no-require-imports */
    return (
      require('./protectedNamespace.js') as typeof import('./protectedNamespace.js')
    ).checkProtectedNamespace()
    /* eslint-enable @typescript-eslint/no-require-imports */
  }
  return false
}
