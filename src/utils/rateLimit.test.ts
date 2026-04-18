/**
 * Unit tests for rate limiting utilities
 */

import { describe, expect, it, beforeEach, afterEach } from 'bun:test'
import {
  RateLimiter,
  apiRequestLimiter,
  fileUploadLimiter,
  toolInvocationLimiter,
  mcpCallLimiter,
  withRateLimit,
  isRateLimitError,
} from './rateLimit.js'
import { SECOND, MINUTE } from '../constants/numbers.js'

describe('RateLimiter', () => {
  let limiter: RateLimiter

  beforeEach(() => {
    limiter = new RateLimiter({
      maxRequests: 5,
      windowMs: 1000, // 1 second
      keyPrefix: 'test',
    })
  })

  afterEach(() => {
    limiter.destroy()
  })

  describe('isAllowed', () => {
    it('should allow requests under the limit', () => {
      const result = limiter.isAllowed('user1')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
    })

    it('should track multiple requests', () => {
      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        const result = limiter.isAllowed('user1')
        expect(result.allowed).toBe(true)
      }

      // 6th request should be denied
      const result = limiter.isAllowed('user1')
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    it('should track different keys independently', () => {
      // Use up limit for user1
      for (let i = 0; i < 5; i++) {
        limiter.isAllowed('user1')
      }

      // user1 should be blocked
      expect(limiter.isAllowed('user1').allowed).toBe(false)

      // user2 should still be allowed
      expect(limiter.isAllowed('user2').allowed).toBe(true)
    })

    it('should reset after window expires', async () => {
      // Use up limit
      for (let i = 0; i < 5; i++) {
        limiter.isAllowed('user1')
      }
      expect(limiter.isAllowed('user1').allowed).toBe(false)

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100))

      // Should be allowed again
      const result = limiter.isAllowed('user1')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
    })
  })

  describe('check', () => {
    it('should be alias for isAllowed', () => {
      const result1 = limiter.check('user1')
      const result2 = limiter.isAllowed('user1')
      expect(result1.allowed).toBe(result2.allowed)
    })
  })

  describe('reset', () => {
    it('should reset rate limit for a key', () => {
      // Use up limit
      for (let i = 0; i < 5; i++) {
        limiter.isAllowed('user1')
      }
      expect(limiter.isAllowed('user1').allowed).toBe(false)

      // Reset
      limiter.reset('user1')

      // Should be allowed again
      expect(limiter.isAllowed('user1').allowed).toBe(true)
    })
  })

  describe('resetAll', () => {
    it('should reset all rate limits', () => {
      // Use up limits
      for (let i = 0; i < 5; i++) {
        limiter.isAllowed('user1')
        limiter.isAllowed('user2')
      }

      // Reset all
      limiter.resetAll()

      // Both should be allowed
      expect(limiter.isAllowed('user1').allowed).toBe(true)
      expect(limiter.isAllowed('user2').allowed).toBe(true)
    })
  })

  describe('getStatus', () => {
    it('should return current status', () => {
      limiter.isAllowed('user1')
      limiter.isAllowed('user1')

      const status = limiter.getStatus('user1')
      expect(status.current).toBe(2)
      expect(status.max).toBe(5)
      expect(status.windowMs).toBe(1000)
    })

    it('should return zero for unknown key', () => {
      const status = limiter.getStatus('unknown')
      expect(status.current).toBe(0)
      expect(status.max).toBe(5)
    })
  })
})

describe('Global limiters', () => {
  it('should have correct default configurations', () => {
    // API limiter: 60 per minute
    expect(apiRequestLimiter.getStatus('test').max).toBe(60)

    // File upload limiter: 100 per hour
    expect(fileUploadLimiter.getStatus('test').max).toBe(100)

    // Tool invocation limiter: 1000 per minute
    expect(toolInvocationLimiter.getStatus('test').max).toBe(1000)

    // MCP call limiter: 100 per minute
    expect(mcpCallLimiter.getStatus('test').max).toBe(100)
  })

  afterEach(() => {
    apiRequestLimiter.resetAll()
    fileUploadLimiter.resetAll()
    toolInvocationLimiter.resetAll()
    mcpCallLimiter.resetAll()
  })
})

describe('withRateLimit', () => {
  it('should allow function execution when under limit', async () => {
    const limiter = new RateLimiter({
      maxRequests: 5,
      windowMs: 1000,
      keyPrefix: 'wrap-test',
    })

    const fn = async (value: number) => value * 2
    const wrapped = withRateLimit(fn, limiter, (val) => `key-${val}`)

    const result = await wrapped(5)
    expect(result).toBe(10)

    limiter.destroy()
  })

  it('should throw when rate limit exceeded', async () => {
    const limiter = new RateLimiter({
      maxRequests: 2,
      windowMs: 1000,
      keyPrefix: 'wrap-test',
    })

    const fn = async () => 'success'
    const wrapped = withRateLimit(fn, limiter, () => 'same-key')

    // First 2 calls succeed
    await wrapped()
    await wrapped()

    // 3rd call should throw
    try {
      await wrapped()
      expect(false).toBe(true) // Should not reach here
    } catch (error) {
      expect(error instanceof Error).toBe(true)
      expect((error as Error).message).toContain('Rate limit exceeded')
    }

    limiter.destroy()
  })
})

describe('isRateLimitError', () => {
  it('should return true for rate limit errors', () => {
    const error = new Error('Rate limit exceeded')
    ;(error as Error & { code: string }).code = 'RATE_LIMIT_EXCEEDED'

    expect(isRateLimitError(error)).toBe(true)
  })

  it('should return false for regular errors', () => {
    const error = new Error('Some other error')
    expect(isRateLimitError(error)).toBe(false)
  })

  it('should return false for non-errors', () => {
    expect(isRateLimitError('string')).toBe(false)
    expect(isRateLimitError(null)).toBe(false)
    expect(isRateLimitError(undefined)).toBe(false)
  })
})
