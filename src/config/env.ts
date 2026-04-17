/**
 * Centralized environment variable management
 * 
 * This module provides type-safe, validated access to environment variables
 * with centralized documentation and defaults.
 */

import { isEnvTruthy } from '../utils/envUtils.js';

/**
 * Environment variable with metadata for type safety and documentation
 */
interface EnvVar<T> {
  readonly key: string;
  readonly defaultValue: T | undefined;
  readonly parser: (value: string | undefined) => T;
  readonly description: string;
}

/**
 * Creates an environment variable configuration
 */
function createEnvVar<T>(
  key: string,
  parser: (value: string | undefined) => T,
  options: { defaultValue?: T; description: string }
): EnvVar<T> {
  return {
    key,
    defaultValue: options.defaultValue,
    parser,
    description: options.description,
  };
}

// Parsers
const stringParser = (v: string | undefined): string | undefined => v;
const booleanParser = (v: string | undefined): boolean => isEnvTruthy(v);
const numberParser = (v: string | undefined): number | undefined => 
  v ? Number(v) : undefined;

/**
 * Environment variable definitions
 */
export const ENV_VARS = {
  // Mode flags
  HAWK_CODE_SIMPLE: createEnvVar(
    'HAWK_CODE_SIMPLE',
    booleanParser,
    { defaultValue: false, description: 'Enable simple mode (bare mode)' }
  ),
  HAWK_CODE_REMOTE: createEnvVar(
    'HAWK_CODE_REMOTE',
    booleanParser,
    { defaultValue: false, description: 'Enable remote/CCR mode' }
  ),
  HAWK_CODE_ENTRYPOINT: createEnvVar(
    'HAWK_CODE_ENTRYPOINT',
    stringParser,
    { defaultValue: undefined, description: 'Entrypoint mode (e.g., local-agent)' }
  ),
  
  // Feature flags
  ENABLE_LSP_TOOL: createEnvVar(
    'ENABLE_LSP_TOOL',
    booleanParser,
    { defaultValue: false, description: 'Enable LSP tool integration' }
  ),
  HAWK_CODE_VERIFY_PLAN: createEnvVar(
    'HAWK_CODE_VERIFY_PLAN',
    booleanParser,
    { defaultValue: false, description: 'Enable plan verification' }
  ),
  HAWK_CODE_EAGER_FLUSH: createEnvVar(
    'HAWK_CODE_EAGER_FLUSH',
    booleanParser,
    { defaultValue: false, description: 'Enable eager session storage flush' }
  ),
  HAWK_CODE_IS_COWORK: createEnvVar(
    'HAWK_CODE_IS_COWORK',
    booleanParser,
    { defaultValue: false, description: 'Running in cowork mode' }
  ),
  
  // Configuration
  HAWK_CONFIG_DIR: createEnvVar(
    'HAWK_CONFIG_DIR',
    stringParser,
    { defaultValue: undefined, description: 'Custom config directory path' }
  ),
  NODE_ENV: createEnvVar(
    'NODE_ENV',
    stringParser,
    { defaultValue: 'production', description: 'Node environment' }
  ),
  USER_TYPE: createEnvVar(
    'USER_TYPE',
    stringParser,
    { defaultValue: undefined, description: 'User type (e.g., ant)' }
  ),
  
  // API Keys and providers
  GRAYCODE_API_KEY: createEnvVar(
    'GRAYCODE_API_KEY',
    stringParser,
    { defaultValue: undefined, description: 'GrayCode API key' }
  ),
  OPENAI_API_KEY: createEnvVar(
    'OPENAI_API_KEY',
    stringParser,
    { defaultValue: undefined, description: 'OpenAI API key' }
  ),
  ANTHROPIC_API_KEY: createEnvVar(
    'ANTHROPIC_API_KEY',
    stringParser,
    { defaultValue: undefined, description: 'Anthropic API key' }
  ),
  GEMINI_API_KEY: createEnvVar(
    'GEMINI_API_KEY',
    stringParser,
    { defaultValue: undefined, description: 'Gemini API key' }
  ),
  GROK_API_KEY: createEnvVar(
    'GROK_API_KEY',
    stringParser,
    { defaultValue: undefined, description: 'Grok/XAI API key' }
  ),
  XAI_API_KEY: createEnvVar(
    'XAI_API_KEY',
    stringParser,
    { defaultValue: undefined, description: 'XAI API key (alias)' }
  ),
  OPENROUTER_API_KEY: createEnvVar(
    'OPENROUTER_API_KEY',
    stringParser,
    { defaultValue: undefined, description: 'OpenRouter API key' }
  ),
  
  // CI/Environment
  CI: createEnvVar(
    'CI',
    booleanParser,
    { defaultValue: false, description: 'Running in CI environment' }
  ),
  GITHUB_ACTIONS: createEnvVar(
    'GITHUB_ACTIONS',
    booleanParser,
    { defaultValue: false, description: 'Running in GitHub Actions' }
  ),
  
  // Advanced settings
  MAX_STRUCTURED_OUTPUT_RETRIES: createEnvVar(
    'MAX_STRUCTURED_OUTPUT_RETRIES',
    numberParser,
    { defaultValue: 5, description: 'Max retries for structured output' }
  ),
  HAWK_BASH_MAINTAIN_PROJECT_WORKING_DIR: createEnvVar(
    'HAWK_BASH_MAINTAIN_PROJECT_WORKING_DIR',
    booleanParser,
    { defaultValue: false, description: 'Reset to project dir after bash commands' }
  ),
} as const;

/**
 * Type-safe environment variable accessor
 */
export function getEnv<K extends keyof typeof ENV_VARS>(
  key: K
): ReturnType<(typeof ENV_VARS)[K]['parser']> {
  const config = ENV_VARS[key];
  const value = process.env[config.key];
  return config.parser(value) ?? (config.defaultValue as ReturnType<(typeof ENV_VARS)[K]['parser']>);
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return getEnv('NODE_ENV') === 'development';
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return getEnv('NODE_ENV') === 'test';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return getEnv('NODE_ENV') === 'production';
}

/**
 * Check if current user is internal (ant)
 */
export function isInternalUser(): boolean {
  return getEnv('USER_TYPE') === 'ant';
}

/**
 * Get all environment info for debugging
 */
export function getEnvironmentInfo(): Record<string, unknown> {
  return {
    nodeEnv: getEnv('NODE_ENV'),
    userType: getEnv('USER_TYPE'),
    isSimpleMode: getEnv('HAWK_CODE_SIMPLE'),
    isRemoteMode: getEnv('HAWK_CODE_REMOTE'),
    hasGrayCodeKey: !!getEnv('GRAYCODE_API_KEY'),
    hasOpenAIKey: !!getEnv('OPENAI_API_KEY'),
    hasAnthropicKey: !!getEnv('ANTHROPIC_API_KEY'),
    hasGeminiKey: !!getEnv('GEMINI_API_KEY'),
    hasGrokKey: !!getEnv('GROK_API_KEY') || !!getEnv('XAI_API_KEY'),
    hasOpenRouterKey: !!getEnv('OPENROUTER_API_KEY'),
  };
}
