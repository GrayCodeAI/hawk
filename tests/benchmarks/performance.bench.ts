/**
 * Performance Benchmarks
 * Run with: bun test tests/benchmarks/performance.bench.ts
 */

import { bench, describe } from 'bun:test'
import { RateLimiter } from '../../src/utils/rateLimit.js'
import { memoizeWithTTL } from '../../src/utils/memoize.js'
import { sanitizeObject } from '../../src/utils/security/sanitize.js'

describe('Performance Benchmarks', () => {
  bench('RateLimiter - 1000 token requests', () => {
    const limiter = new RateLimiter({
      tokensPerInterval: 1000,
      interval: 1000,
    })

    for (let i = 0; i < 1000; i++) {
      limiter.removeTokens(1)
    }
  })

  bench('Memoize - 1000 cache hits', () => {
    let callCount = 0
    const fn = () => {
      callCount++
      return callCount
    }
    const memoized = memoizeWithTTL(fn, 1000)

    for (let i = 0; i < 1000; i++) {
      memoized()
    }
  })

  bench('Sanitize - large object (1000 keys)', () => {
    const largeObj = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      apiKey: `key-${i}`,
      secret: `secret-${i}`,
    }))

    sanitizeObject(largeObj)
  })

  bench('Sanitize - deeply nested object', () => {
    const nestedObj = {
      level1: {
        level2: {
          level3: {
            level4: {
              level5: {
                apiKey: 'secret-key',
              },
            },
          },
        },
      },
    }

    sanitizeObject(nestedObj)
  })
})
