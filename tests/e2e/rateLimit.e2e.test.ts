/**
 * E2E Tests for Rate Limiting
 * Tests real-world scenarios with actual timing
 */

import { describe, expect, it } from 'bun:test'
import { RateLimiter, apiRequestLimiter } from '../../src/utils/rateLimit.js'
import { SECOND, MINUTE } from '../../src/constants/numbers.js'

describe('Rate Limiting E2E', () => {
  it('should handle burst traffic', async () => {
    const limiter = new RateLimiter({
      maxRequests: 10,
      windowMs: SECOND,
    })

    // Send 10 requests simultaneously (burst)
    const promises = Array.from({ length: 10 }, () => 
      Promise.resolve(limiter.check('user1'))
    )
    const results = await Promise.all(promises)

    // All should be allowed
    expect(results.every(r => r.allowed)).toBe(true)

    // 11th request should be blocked
    expect(limiter.check('user1').allowed).toBe(false)

    limiter.destroy()
  })

  it('should handle multiple users independently', async () => {
    const limiter = new RateLimiter({
      maxRequests: 5,
      windowMs: MINUTE,
    })

    // Exhaust limit for user1
    for (let i = 0; i < 5; i++) {
      limiter.check('user1')
    }

    // User1 blocked
    expect(limiter.check('user1').allowed).toBe(false)

    // User2 should still be allowed
    expect(limiter.check('user2').allowed).toBe(true)

    limiter.destroy()
  })

  it('should recover after window expires', async () => {
    const limiter = new RateLimiter({
      maxRequests: 2,
      windowMs: 100, // 100ms for fast test
    })

    // Use up limit
    limiter.check('user1')
    limiter.check('user1')
    expect(limiter.check('user1').allowed).toBe(false)

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 150))

    // Should be allowed again
    expect(limiter.check('user1').allowed).toBe(true)

    limiter.destroy()
  })

  it('should handle real API request simulation', async () => {
    const limiter = new RateLimiter({
      maxRequests: 100,
      windowMs: MINUTE,
    })

    // Simulate 100 API requests
    const startTime = Date.now()
    const results = []

    for (let i = 0; i < 100; i++) {
      results.push(limiter.check('api-user'))
    }

    const endTime = Date.now()

    // Should complete quickly (< 10ms for 100 checks)
    expect(endTime - startTime).toBeLessThan(10)

    // All should be allowed
    expect(results.every(r => r.allowed)).toBe(true)

    // 101st should be blocked
    expect(limiter.check('api-user').allowed).toBe(false)

    limiter.destroy()
  })

  it('should handle concurrent requests from same user', async () => {
    const limiter = new RateLimiter({
      maxRequests: 50,
      windowMs: MINUTE,
    })

    // 100 concurrent requests
    const promises = Array.from({ length: 100 }, () => 
      Promise.resolve(limiter.check('concurrent-user'))
    )

    const results = await Promise.all(promises)

    // First 50 should be allowed
    const allowed = results.filter(r => r.allowed).length
    expect(allowed).toBe(50)

    // Rest should be blocked
    const blocked = results.filter(r => !r.allowed).length
    expect(blocked).toBe(50)

    limiter.destroy()
  })
})
