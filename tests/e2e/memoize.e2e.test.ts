/**
 * E2E Tests for Memoization
 * Tests caching performance and TTL behavior
 */

import { describe, expect, it } from 'bun:test'
import { memoizeWithTTL, memoizeWithLRU } from '../../src/utils/memoize.js'
import { SECOND, MINUTE } from '../../src/constants/numbers.js'

describe('Memoization E2E', () => {
  it('should cache expensive computations', async () => {
    let computeCount = 0
    const expensiveFn = (n: number) => {
      computeCount++
      // Simulate expensive computation
      let sum = 0
      for (let i = 0; i < 1000000; i++) {
        sum += i * n
      }
      return sum
    }

    const memoized = memoizeWithTTL(expensiveFn, 1000)

    // First call
    const start1 = Date.now()
    const result1 = memoized(5)
    const time1 = Date.now() - start1

    // Second call (should be cached)
    const start2 = Date.now()
    const result2 = memoized(5)
    const time2 = Date.now() - start2

    expect(result1).toBe(result2)
    expect(computeCount).toBe(1)
    expect(time2).toBeLessThan(time1 / 10) // Should be much faster

    memoized.clear()
  })

  it('should expire cache after TTL', async () => {
    let callCount = 0
    const fn = () => {
      callCount++
      return Date.now()
    }

    const memoized = memoizeWithTTL(fn, 100) // 100ms TTL

    const result1 = memoized()
    const result2 = memoized()
    expect(result1).toBe(result2)
    expect(callCount).toBe(1)

    // Wait for TTL to expire
    await new Promise(resolve => setTimeout(resolve, 150))

    const result3 = memoized()
    expect(result3).not.toBe(result1)
    expect(callCount).toBe(2)

    memoized.clear()
  })

  it('should implement LRU eviction', () => {
    const evictions = 0
    const fn = (key: string) => {
      return `value-${key}`
    }

    const memoized = memoizeWithLRU(fn, key => key, 3)

    // Add 3 items
    memoized('a')
    memoized('b')
    memoized('c')

    expect(memoized.cache.size).toBe(3)

    // Access 'a' to make it recently used
    memoized('a')

    // Add 4th item - should evict 'b' (least recently used)
    memoized('d')

    expect(memoized.cache.size).toBe(3)
    expect(memoized.cache.has('a')).toBe(true)
    expect(memoized.cache.has('c')).toBe(true)
    expect(memoized.cache.has('d')).toBe(true)
  })

  it('should handle high concurrency', async () => {
    let callCount = 0
    const fn = async (id: number) => {
      callCount++
      await new Promise(resolve => setTimeout(resolve, 10))
      return `result-${id}`
    }

    const memoized = memoizeWithTTL(fn, 1000)

    // 100 concurrent calls with same ID
    const promises = Array.from({ length: 100 }, () => memoized(1))
    const results = await Promise.all(promises)

    // Should only call once
    expect(callCount).toBe(1)
    expect(results.every(r => r === 'result-1')).toBe(true)

    memoized.clear()
  })
})
