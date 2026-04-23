/**
 * Type guard utilities for safe type narrowing
 * Replace unsafe 'as' casts with runtime type checking
 */

import type { FileEditOutput } from '../tools/FileEditTool/types.js'
import type { Output as FileWriteToolOutput } from '../tools/FileWriteTool/FileWriteTool.js'

/**
 * Type guard for FileEditOutput
 * @param value - Value to check
 * @returns true if value matches FileEditOutput structure
 */
export function isFileEditOutput(value: unknown): value is FileEditOutput {
  if (!value || typeof value !== 'object') {
    return false
  }

  const obj = value as Record<string, unknown>
  
  return (
    typeof obj.filePath === 'string' &&
    typeof obj.oldString === 'string' &&
    typeof obj.newString === 'string' &&
    typeof obj.originalFile === 'string' &&
    Array.isArray(obj.structuredPatch) &&
    typeof obj.userModified === 'boolean' &&
    typeof obj.replaceAll === 'boolean'
  )
}

/**
 * Type guard for FileWriteToolOutput
 * @param value - Value to check
 * @returns true if value matches FileWriteToolOutput structure
 */
export function isFileWriteOutput(value: unknown): value is FileWriteToolOutput {
  if (!value || typeof value !== 'object') {
    return false
  }

  const obj = value as Record<string, unknown>
  
  return (
    (obj.type === 'create' || obj.type === 'update') &&
    typeof obj.filePath === 'string' &&
    typeof obj.content === 'string' &&
    Array.isArray(obj.structuredPatch) &&
    (obj.originalFile === null || typeof obj.originalFile === 'string')
  )
}

/**
 * Type guard for checking if a value is a tool result of specific types
 * @param value - Value to check
 * @returns true if value is either FileEditOutput or FileWriteToolOutput
 */
export function isToolResult(value: unknown): value is FileEditOutput | FileWriteToolOutput {
  return isFileEditOutput(value) || isFileWriteOutput(value)
}

/**
 * Type guard for checking if a string or string array is defined
 * Commonly used pattern: `as string | string[] | undefined`
 * @param value - Value to check
 * @returns true if value is a string, string array, or undefined
 */
export function isOptionalStringOrStringArray(value: unknown): value is string | string[] | undefined {
  if (value === undefined) {
    return true
  }
  if (typeof value === 'string') {
    return true
  }
  if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
    return true
  }
  return false
}

/**
 * Type guard for checking if a value is a number or undefined
 * Commonly used pattern: `as number | undefined`
 * @param value - Value to check
 * @returns true if value is a number or undefined
 */
export function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || typeof value === 'number'
}

/**
 * Type guard for checking if a value is a string or undefined
 * Commonly used pattern: `as string | undefined`
 * @param value - Value to check
 * @returns true if value is a string or undefined
 */
export function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string'
}

/**
 * Type guard for checking if a value is a boolean or undefined
 * Commonly used pattern: `as boolean | undefined`
 * @param value - Value to check
 * @returns true if value is a boolean or undefined
 */
export function isOptionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === 'boolean'
}

/**
 * Type guard for checking event metadata
 * Based on patterns found in firstPartyEventLoggingExporter.ts
 * @param value - Value to check
 * @returns true if value matches EventMetadata structure
 */
export function isEventMetadata(value: unknown): value is { event_id?: string; device_id?: string } {
  if (!value || typeof value !== 'object') {
    return false
  }

  const obj = value as Record<string, unknown>
  
  return (
    (obj.event_id === undefined || typeof obj.event_id === 'string') &&
    (obj.device_id === undefined || typeof obj.device_id === 'string')
  )
}

/**
 * Type guard for checking OverageDisabledReason
 * Based on patterns found in hawkAiLimits.ts
 * @param value - Value to check
 * @returns true if value is a valid OverageDisabledReason
 */
export function isOverageDisabledReason(value: unknown): value is 'admin_disabled' | 'no_payment_method' | 'payment_failed' | 'spending_limit_reached' | null {
  if (value === null) {
    return true
  }
  if (typeof value !== 'string') {
    return false
  }
  return ['admin_disabled', 'no_payment_method', 'payment_failed', 'spending_limit_reached'].includes(value)
}

/**
 * Type guard for checking RateLimitType
 * Based on patterns found in hawkAiLimits.ts
 * @param value - Value to check
 * @returns true if value is a valid RateLimitType
 */
export function isRateLimitType(value: unknown): value is 'requests' | 'tokens' | null {
  if (value === null) {
    return true
  }
  if (typeof value !== 'string') {
    return false
  }
  return value === 'requests' || value === 'tokens'
}

/**
 * Type guard for checking if a value is a Response or undefined
 * Commonly used pattern: `as Response | undefined`
 * @param value - Value to check
 * @returns true if value is a Response object or undefined
 */
export function isOptionalResponse(value: unknown): value is Response | undefined {
  if (value === undefined) {
    return true
  }
  return value instanceof Response || (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    'headers' in value &&
    typeof (value as any).status === 'number'
  )
}

/**
 * Safe type assertion with runtime validation
 * Throws a descriptive error if validation fails
 * @param value - Value to validate
 * @param guard - Type guard function
 * @param typeName - Name of the expected type for error messages
 * @returns The validated value with proper type
 * @throws Error if validation fails
 */
export function assertType<T>(
  value: unknown,
  guard: (val: unknown) => val is T,
  typeName: string
): T {
  if (guard(value)) {
    return value
  }
  throw new TypeError(`Expected ${typeName}, received ${typeof value}: ${JSON.stringify(value)}`)
}

/**
 * Safe type assertion with fallback value
 * Returns fallback if validation fails instead of throwing
 * @param value - Value to validate
 * @param guard - Type guard function
 * @param fallback - Fallback value if validation fails
 * @returns The validated value or fallback
 */
export function assertTypeWithFallback<T>(
  value: unknown,
  guard: (val: unknown) => val is T,
  fallback: T
): T {
  if (guard(value)) {
    return value
  }
  return fallback
}
