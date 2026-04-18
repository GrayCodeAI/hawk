/**
 * E2E Tests for Request Deduplication
 */

import { describe, expect, it } from 'bun:test'
import { RequestDeduplicator, withDeduplication } from '../../src/utils/batchRequests.js'

describe('Request Deduplication E2E', () => {
  it('should deduplicate identical requests', async () => {
    let apiCallCount = 0
    const apiCall = async (id: string) => {
      apiCallCount++
      await new Promise(resolve => setTimeout(resolve, 50))
      return { id, data: 'response' }
    }

    const deduplicator = new RequestDeduplicator<string, { id: string; data: string }>()

    // Fire 10 identical requests
    const promises = Array.from({ length: 10 }, () =>
      deduplicator.execute('same-id', () => apiCall('same-id'))
    )

    const results = await Promise.all(promises)

    expect(apiCallCount).toBe(1)
    expect(results.every(r => r.id === 'same-id')).toBe(true)
  })

  it('should allow new requests after completion', async () => {
    let callCount = 0
    const fn = async () => {
      callCount++
      return `result-${callCount}`
    }

    const deduplicator = new RequestDeduplicator<string, string>()

    const result1 = await deduplicator.execute('key', fn)
    expect(result1).toBe('result-1')

    const result2 = await deduplicator.execute('key', fn)
    expect(result2).toBe('result-2')

    expect(callCount).toBe(2)
  })

  it('should track pending status correctly', async () => {
    const deduplicator = new RequestDeduplicator<string, string>()

    const slowFn = async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
      return 'done'
    }

    expect(deduplicator.isPending('slow-key')).toBe(false)

    deduplicator.execute('slow-key', slowFn)
    expect(deduplicator.isPending('slow-key')).toBe(true)

    await new Promise(resolve => setTimeout(resolve, 150))
    expect(deduplicator.isPending('slow-key')).toBe(false)
  })

  it('should work with withDeduplication wrapper', async () => {
    let callCount = 0
    const fetchUser = async (userId: number) => {
      callCount++
      await new Promise(resolve => setTimeout(resolve, 20))
      return { userId, name: `User ${userId}` }
    }

    const dedupedFetch = withDeduplication(fetchUser, (id) => `user-${id}`)

    // 5 requests for same user
    const promises = Array.from({ length: 5 }, () => dedupedFetch(123))
    const results = await Promise.all(promises)

    expect(callCount).toBe(1)
    expect(results.every(r => r.userId === 123)).toBe(true)
  })
})
