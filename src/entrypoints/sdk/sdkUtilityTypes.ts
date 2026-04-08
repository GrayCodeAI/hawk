/**
 * SDK Utility Types
 *
 * Helper types that cannot be expressed as Zod schemas (generic utilities,
 * mapped types, conditional types). Manually maintained.
 */

import type { BetaUsage } from '@hawk/eyrie'

/**
 * Usage object with all fields required (no optional nulls).
 * Used for cumulative token tracking where every field must be present.
 */
export type NonNullableUsage = Required<{
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
  server_tool_use?: {
    web_search_requests: number
  }
}>
