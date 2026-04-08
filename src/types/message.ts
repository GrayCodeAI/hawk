/**
 * Message types for Hawk
 *
 * Extended message type combining:
 * - Base SDK types from eyrie
 * - Hawk internal message fields (uuid, metadata, origins)
 * - Bridge/runtime message extensions
 */

import type {
  ContentBlock,
  ContentBlockParam,
  ThinkingBlock,
  MessageParam,
  BetaMessage,
  BetaMessageParam,
} from '@hawk/eyrie'

// ============================================================================
// Base Message Type (Extended)
// ============================================================================

export interface Message {
  // Core message properties
  id?: string
  uuid?: string
  type?: 'message'
  role: 'user' | 'assistant' | 'system'
  content: string | ContentBlock[]
  model?: string
  stop_reason?: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null
  stop_sequence?: string | null

  // Usage information
  usage?: {
    input_tokens: number
    output_tokens: number
  }

  // Hawk-specific metadata
  isVirtual?: boolean
  isMeta?: boolean
  isCompactSummary?: boolean
  origin?: string
  source?: string

  // Tool-related metadata
  toolUseResult?: unknown
  toolName?: string
  toolId?: string

  // Message subtype discrimination
  subtype?: string
  message?: unknown

  // Additional metadata
  timestamp?: number
  sessionId?: string
  agentId?: string
  isErrorMessage?: boolean
  errorDetails?: {
    actualTokens?: number
    limitTokens?: number
  }
}

// ============================================================================
// Hawk-Specific Message Types (Extensions)
// ============================================================================

/**
 * Progress message shown during tool execution
 */
export interface ProgressMessage {
  type: 'progress'
  tool: string
  message: string
  percentage?: number
}

/**
 * Local command output (not sent to LLM)
 */
export interface LocalCommandMessage {
  type: 'local_command'
  command: string
  output: string
  exitCode: number
}

/**
 * Session state changed notification
 */
export interface SessionStateMessage {
  type: 'session_state_changed'
  state: 'started' | 'paused' | 'resumed' | 'ended'
  timestamp: number
}

/**
 * Task notification
 */
export interface TaskNotificationMessage {
  type: 'task_notification'
  taskId: string
  message: string
  status?: 'created' | 'started' | 'completed' | 'failed'
}

/**
 * Hook execution update
 */
export interface HookMessage {
  type: 'hook'
  event: string
  status: 'started' | 'executing' | 'completed' | 'failed'
  data?: unknown
}

/**
 * Status message for display
 */
export interface StatusMessage {
  type: 'status'
  status: 'pending' | 'running' | 'success' | 'error' | 'warning'
  message: string
  details?: string
}

/**
 * File persistence event
 */
export interface FilesPersistedMessage {
  type: 'files_persisted'
  files: string[]
}

/**
 * Compact boundary message
 */
export interface CompactBoundaryMessage {
  type: 'compact_boundary'
  reason: string
  tokensSaved?: number
}

/**
 * API retry notification
 */
export interface APIRetryMessage {
  type: 'api_retry'
  attempt: number
  maxAttempts: number
  error: string
  retryAfterMs?: number
}

/**
 * Post-turn summary
 */
export interface PostTurnSummaryMessage {
  type: 'post_turn_summary'
  summary: string
  tokensUsed: number
  toolsUsed?: string[]
}

/**
 * Auth status message
 */
export interface AuthStatusMessage {
  type: 'auth_status'
  status: 'authenticated' | 'expired' | 'invalid' | 'required'
  message: string
}

/**
 * Elicitation request
 */
export interface ElicitationMessage {
  type: 'elicitation'
  question: string
  options?: string[]
}

/**
 * Elicitation complete
 */
export interface ElicitationCompleteMessage {
  type: 'elicitation_complete'
  answer: string
}

/**
 * Prompt suggestion
 */
export interface PromptSuggestionMessage {
  type: 'prompt_suggestion'
  suggestion: string
  reason?: string
}

/**
 * Rate limit info
 */
export interface RateLimitMessage {
  type: 'rate_limit'
  remaining: number
  total: number
  resetAt?: number
}

/**
 * Union of all message types in Hawk
 */
export type HawkMessage =
  | Message
  | ProgressMessage
  | LocalCommandMessage
  | SessionStateMessage
  | TaskNotificationMessage
  | HookMessage
  | StatusMessage
  | FilesPersistedMessage
  | CompactBoundaryMessage
  | APIRetryMessage
  | PostTurnSummaryMessage
  | AuthStatusMessage
  | ElicitationMessage
  | ElicitationCompleteMessage
  | PromptSuggestionMessage
  | RateLimitMessage

// ============================================================================
// Type Guards
// ============================================================================

export function isProgressMessage(msg: unknown): msg is ProgressMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as { type?: unknown }).type === 'progress'
  )
}

export function isLocalCommandMessage(msg: unknown): msg is LocalCommandMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as { type?: unknown }).type === 'local_command'
  )
}

export function isStatusMessage(msg: unknown): msg is StatusMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as { type?: unknown }).type === 'status'
  )
}

// ============================================================================
// Hawk-Specific Concrete Message Types
// ============================================================================

/**
 * User-originated message (role === 'user')
 */
export interface UserMessage extends Message {
  role: 'user'
  /** Attachments sent with the user message */
  attachments?: Array<{
    type: 'file' | 'image' | 'url'
    name?: string
    content?: string
    url?: string
  }>
}

/**
 * Assistant-originated message (role === 'assistant')
 */
export interface AssistantMessage extends Message {
  role: 'assistant'
  /** True when this message was synthesized from an API error (not a real reply) */
  isApiErrorMessage?: boolean
  /** Token counts when the error was "prompt too long" */
  errorDetails?: {
    actualTokens?: number
    limitTokens?: number
  }
}

/**
 * Normalized user message – the canonical form of a user message after
 * attachments, paste events, etc. have been resolved into content blocks.
 */
export type NormalizedUserMessage = UserMessage & {
  content: ContentBlock[]
}

/**
 * System-level error message shown in the UI (not sent to the API)
 */
export interface SystemAPIErrorMessage extends Message {
  role: 'system'
  subtype: 'api_error'
  error: {
    message: string
    code?: string | number
    type?: string
  }
}

// ============================================================================
// Re-exports from eyrie for convenience
// ============================================================================

export type {
  ContentBlock,
  ContentBlockParam,
  ThinkingBlock,
  MessageParam,
  BetaMessage,
  BetaMessageParam,
}
