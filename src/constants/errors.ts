/**
 * Centralized error messages and constants
 */

// API Error prefixes and messages
export const API_ERROR_MESSAGE_PREFIX = 'API Error';
export const PROMPT_TOO_LONG_ERROR_MESSAGE = 'Prompt is too long';
export const CREDIT_BALANCE_TOO_LOW_ERROR_MESSAGE = 'Credit balance is too low';
export const INVALID_API_KEY_ERROR_MESSAGE = 'Not logged in · Use /config';
export const INVALID_API_KEY_ERROR_MESSAGE_EXTERNAL = 'Invalid API key · Fix external API key';
export const ORG_DISABLED_ERROR_MESSAGE_ENV_KEY_WITH_OAUTH = 'Your configured API key belongs to a disabled organization · Unset or replace the key to continue';
export const ORG_DISABLED_ERROR_MESSAGE_ENV_KEY = 'Your configured API key belongs to a disabled organization · Update or unset the environment variable';
export const TOKEN_REVOKED_ERROR_MESSAGE = 'OAuth token revoked · Use /config';
export const CCR_AUTH_ERROR_MESSAGE = 'Authentication error · This may be a temporary network issue, please try again';
export const REPEATED_529_ERROR_MESSAGE = 'Repeated 529 Overloaded errors';
export const CUSTOM_OFF_SWITCH_MESSAGE = 'Opus is experiencing high load, please use /model to switch to Sonnet';
export const API_TIMEOUT_ERROR_MESSAGE = 'Request timed out';
export const OAUTH_ORG_NOT_ALLOWED_ERROR_MESSAGE = 'Your account does not have access to Hawk. Please use /config.';

// Status codes
export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  REQUEST_TIMEOUT: 408,
  RATE_LIMIT: 429,
  SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  OVERLOADED: 529,
} as const;

// Model suggestions
export const MODEL_SUGGESTIONS = {
  FALLBACK_OPUS: 'claude-opus-4-1-20250801',
  FALLBACK_SONNET_45: 'claude-sonnet-4-5-20251022',
  FALLBACK_SONNET_40: 'claude-sonnet-4-20250514',
} as const;

// File limits
export const FILE_LIMITS = {
  PDF_MAX_PAGES: 100,
  IMAGE_MAX_SIZE_MB: 5,
  IMAGE_MAX_DIMENSION_MANY_IMAGE: 2000,
  REQUEST_MAX_SIZE_MB: 32,
} as const;

// Retry configuration
export const RETRY_CONFIG = {
  MAX_STRUCTURED_OUTPUT_RETRIES: 5,
  DEFAULT_MAX_TURNS: 100,
} as const;

// Error categories for analytics
export const ERROR_CATEGORIES = {
  ABORTED: 'aborted',
  API_TIMEOUT: 'api_timeout',
  RATE_LIMIT: 'rate_limit',
  SERVER_OVERLOAD: 'server_overload',
  PROMPT_TOO_LONG: 'prompt_too_long',
  PDF_TOO_LARGE: 'pdf_too_large',
  PDF_PASSWORD_PROTECTED: 'pdf_password_protected',
  IMAGE_TOO_LARGE: 'image_too_large',
  TOOL_USE_MISMATCH: 'tool_use_mismatch',
  UNEXPECTED_TOOL_RESULT: 'unexpected_tool_result',
  DUPLICATE_TOOL_USE_ID: 'duplicate_tool_use_id',
  INVALID_MODEL: 'invalid_model',
  CREDIT_BALANCE_LOW: 'credit_balance_low',
  INVALID_API_KEY: 'invalid_api_key',
  TOKEN_REVOKED: 'token_revoked',
  OAUTH_ORG_NOT_ALLOWED: 'oauth_org_not_allowed',
  AUTH_ERROR: 'auth_error',
  SERVER_ERROR: 'server_error',
  CLIENT_ERROR: 'client_error',
  CONNECTION_ERROR: 'connection_error',
  SSL_CERT_ERROR: 'ssl_cert_error',
  UNKNOWN: 'unknown',
} as const;

// Type for error categories
export type ErrorCategory = typeof ERROR_CATEGORIES[keyof typeof ERROR_CATEGORIES];

// Tool-related constants
export const TOOL_CONSTANTS = {
  SYNTHETIC_OUTPUT_TOOL_NAME: 'synthetic_output',
  REPL_TOOL_NAME: 'repl',
} as const;

// Permission-related constants
export const PERMISSION_CONSTANTS = {
  AUTO_MODE_ENABLED: 'auto',
  ALWAYS_ALLOW: 'always_allow',
  ASK: 'ask',
  DENY: 'deny',
} as const;

// Event names for analytics
export const ANALYTICS_EVENTS = {
  TOOL_USE_MISMATCH: 'tengu_tool_use_tool_result_mismatch_error',
  UNEXPECTED_TOOL_RESULT: 'tengu_unexpected_tool_result',
  DUPLICATE_TOOL_USE_ID: 'tengu_duplicate_tool_use_id',
  API_REFUSAL: 'tengu_refusal_api_response',
} as const;
