/**
 * Rate limiting utilities for API requests and resource usage
 * Prevents abuse and ensures fair resource allocation
 */

import { logError } from './log.js'
import { SECOND, MINUTE } from '../constants/numbers.js'

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number
  /** Time window in milliseconds */
  windowMs: number
  /** Optional key prefix for rate limit tracking */
  keyPrefix?: string
}

/**
 * Rate limit entry tracks request timestamps
 */
interface RateLimitEntry {
  /** Array of request timestamps */
  timestamps: number[]
  /** When the window started */
  windowStart: number
}

/**
 * In-memory rate limiter with sliding window
 * Tracks requests per key and enforces limits
 */
export class RateLimiter {
  private config: RateLimiterConfig
  private requests = new Map<string, RateLimitEntry>()
  private cleanupInterval?: Timer

  constructor(config: RateLimiterConfig) {
    this.config = {
      keyPrefix: 'default',
      ...config,
    }
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), MINUTE)
  }

  /**
   * Check if a request is allowed for the given key
   * @param key - Unique identifier (e.g., user ID, IP address)
   * @returns Object with allowed status and retry info
   */
  isAllowed(key: string): {
    allowed: boolean
    remaining: number
    resetTime: number
    retryAfter?: number
  } {
    const now = Date.now()
    const prefixedKey = `${this.config.keyPrefix}:${key}`
    const entry = this.requests.get(prefixedKey)

    // No entry or window expired - create new
    if (!entry || now - entry.windowStart > this.config.windowMs) {
      this.requests.set(prefixedKey, {
        timestamps: [now],
        windowStart: now,
      })
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs,
      }
    }

    // Remove expired timestamps
    const validTimestamps = entry.timestamps.filter(
      ts => now - ts <= this.config.windowMs
    )

    // Check if under limit
    if (validTimestamps.length < this.config.maxRequests) {
      validTimestamps.push(now)
      entry.timestamps = validTimestamps
      return {
        allowed: true,
        remaining: this.config.maxRequests - validTimestamps.length,
        resetTime: entry.windowStart + this.config.windowMs,
      }
    }

    // Rate limit exceeded
    const oldestTimestamp = validTimestamps[0]!
    const retryAfter = oldestTimestamp + this.config.windowMs - now

    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.windowStart + this.config.windowMs,
      retryAfter: Math.max(0, retryAfter),
    }
  }

  /**
   * Record a request attempt and check if allowed
   * Convenience method that combines check and record
   */
  check(key: string): {
    allowed: boolean
    remaining: number
    resetTime: number
    retryAfter?: number
  } {
    return this.isAllowed(key)
  }

  /**
   * Reset rate limit for a specific key
   * @param key - Key to reset
   */
  reset(key: string): void {
    const prefixedKey = `${this.config.keyPrefix}:${key}`
    this.requests.delete(prefixedKey)
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.requests.clear()
  }

  /**
   * Clean up expired entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.requests.entries()) {
      if (now - entry.windowStart > this.config.windowMs * 2) {
        this.requests.delete(key)
      }
    }
  }

  /**
   * Get current rate limit status for a key
   */
  getStatus(key: string): {
    current: number
    max: number
    windowMs: number
  } {
    const prefixedKey = `${this.config.keyPrefix}:${key}`
    const entry = this.requests.get(prefixedKey)
    const now = Date.now()

    if (!entry) {
      return {
        current: 0,
        max: this.config.maxRequests,
        windowMs: this.config.windowMs,
      }
    }

    const validTimestamps = entry.timestamps.filter(
      ts => now - ts <= this.config.windowMs
    )

    return {
      current: validTimestamps.length,
      max: this.config.maxRequests,
      windowMs: this.config.windowMs,
    }
  }

  /**
   * Stop the cleanup interval
   * Call this when shutting down
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }
}

/**
 * Global rate limiter instances for common use cases
 */

/** Rate limiter for API requests: 60 requests per minute */
export const apiRequestLimiter = new RateLimiter({
  maxRequests: 60,
  windowMs: MINUTE,
  keyPrefix: 'api',
})

/** Rate limiter for file uploads: 100 uploads per hour */
export const fileUploadLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60 * MINUTE,
  keyPrefix: 'upload',
})

/** Rate limiter for tool invocations: 1000 per minute */
export const toolInvocationLimiter = new RateLimiter({
  maxRequests: 1000,
  windowMs: MINUTE,
  keyPrefix: 'tool',
})

/** Rate limiter for MCP server calls: 100 per minute */
export const mcpCallLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: MINUTE,
  keyPrefix: 'mcp',
})

/**
 * Higher-order function to wrap async functions with rate limiting
 * @param fn - Function to rate limit
 * @param limiter - Rate limiter instance
 * @param keyResolver - Function to extract rate limit key from arguments
 */
export function withRateLimit<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  limiter: RateLimiter,
  keyResolver: (...args: Parameters<T>) => string
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const key = keyResolver(...args)
    const result = limiter.check(key)

    if (!result.allowed) {
      const error = new Error(
        `Rate limit exceeded. Retry after ${result.retryAfter}ms`
      )
      ;(error as Error & { retryAfter: number }).retryAfter = result.retryAfter
      ;(error as Error & { code: string }).code = 'RATE_LIMIT_EXCEEDED'
      throw error
    }

    return fn(...args) as ReturnType<T>
  }
}

/**
 * Check if an error is a rate limit error
 */
export function isRateLimitError(error: unknown): error is Error & { code: string; retryAfter: number } {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as Error & { code: string }).code === 'RATE_LIMIT_EXCEEDED'
  )
}
