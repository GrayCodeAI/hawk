/**
 * Numeric constants used throughout the codebase
 * Extracted magic numbers for better maintainability
 */

// Byte sizes (powers of 1024)
export const BYTES_PER_KB = 1024
export const BYTES_PER_MB = 1024 * 1024
export const BYTES_PER_GB = 1024 * 1024 * 1024

// Common byte size aliases
export const KB = BYTES_PER_KB
export const MB = BYTES_PER_MB
export const GB = BYTES_PER_GB

// Time constants (milliseconds)
export const MS_PER_SECOND = 1000
export const MS_PER_MINUTE = 60 * MS_PER_SECOND
export const MS_PER_HOUR = 60 * MS_PER_MINUTE
export const MS_PER_DAY = 24 * MS_PER_HOUR

// Common time aliases
export const SECOND = MS_PER_SECOND
export const MINUTE = MS_PER_MINUTE
export const HOUR = MS_PER_HOUR
export const DAY = MS_PER_DAY

// Common numeric constants
export const DEFAULT_MAX_OUTPUT_TOKENS = 32_000
export const DEFAULT_MAX_OUTPUT_TOKENS_UPPER_LIMIT = 64_000
export const CAPPED_DEFAULT_MAX_TOKENS = 8_000
export const ESCALATED_MAX_TOKENS = 64_000

// Model context window defaults
export const MODEL_CONTEXT_WINDOW_DEFAULT = 200_000
export const MODEL_CONTEXT_WINDOW_1M = 1_000_000
export const COMPACT_MAX_OUTPUT_TOKENS = 20_000

// File size limits (extracted from existing code)
export const MAX_JSONL_READ_BYTES = 100 * MB
export const PARSE_CACHE_MAX_KEY_BYTES = 8 * KB
export const DEFAULT_MAX_CACHE_SIZE_BYTES = 25 * MB
export const MAX_FILE_SIZE_BYTES = 500 * MB
export const MAX_TOTAL_SIZE_BYTES = 5 * GB
export const FAST_PATH_MAX_SIZE = 10 * MB
export const DEFAULT_MAX_MEMORY = 8 * MB
export const MAX_TASK_OUTPUT_BYTES = 5 * GB
export const MAX_MESSAGE_SIZE = 1 * MB
export const CHUNK_SIZE = 8 * KB
export const MAX_SCAN_BYTES = 10 * MB
export const MAX_TOMBSTONE_REWRITE_BYTES = 50 * MB

// Memory thresholds
export const HIGH_MEMORY_THRESHOLD = 1.5 * GB
export const CRITICAL_MEMORY_THRESHOLD = 2.5 * GB

// API limits (some already in apiLimits.ts)
export const MAX_BATCH_BYTES = 10 * MB

// Network/connection constants
export const MAX_STDOUT_BUFFER_SIZE = 64 * MB

// Default limits and thresholds
export const DEFAULT_PAGE_SIZE = 20
export const DEFAULT_TIMEOUT_MS = 30_000
export const DEFAULT_RETRY_ATTEMPTS = 3
export const DEFAULT_RETRY_DELAY_MS = 1_000

// TTL constants for caching
export const SHORT_TTL_MS = 5 * SECOND
export const MEDIUM_TTL_MS = 30 * SECOND
export const LONG_TTL_MS = 5 * MINUTE
export const VERY_LONG_TTL_MS = 1 * HOUR

// Validation constants
export const MAX_URL_LENGTH = 2048
export const MAX_FILENAME_LENGTH = 255
export const MAX_PATH_LENGTH = 4096

// Rate limiting constants
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60 * SECOND
export const DEFAULT_MAX_REQUESTS_PER_WINDOW = 100
