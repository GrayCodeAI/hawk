/**
 * Unit tests for batch request utilities
 */

import { describe, expect, it, beforeEach, afterEach } from 'bun:test'
import {
  BatchProcessor,
  batchAsync,
  RequestDeduplicator,
  globalDeduplicator,
  withDeduplication,
  BatchPresets,
} from './batchRequests.js'

describe('BatchProcessor', () => {
  let processor: BatchProcessor<number, number>

  beforeEach(() => {
    processor = new BatchProcessor<number, number>({
      maxBatchSize: 3,
      maxWaitMs: 100,
      processBatch: async (items) => {
        return items.map(x => x * 2)
      },
    })
  })

  afterEach(async () => {
    await processor.destroy()
  })

  describe('add', () => {
    it('should process single item', async () => {
      const result = await processor.add(5)
      expect(result).toBe(10)
    })

    it('should batch multiple items', async () => {
      const results = await Promise.all([
        processor.add(1),
        processor.add(2),
        processor.add(3),
      ])
      expect(results).toEqual([2, 4, 6])
    })

    it('should process immediately when batch size reached', async () => {
      let batchCallCount = 0
      const trackingProcessor = new BatchProcessor<number, number>({
        maxBatchSize: 2,
        maxWaitMs: 1000, // Long wait time
        processBatch: async (items) => {
          batchCallCount++
          return items.map(x => x * 2)
        },
      })

      // Add 2 items - should process immediately
      const promise1 = trackingProcessor.add(1)
      const promise2 = trackingProcessor.add(2)

      await Promise.all([promise1, promise2])
      expect(batchCallCount).toBe(1)

      await trackingProcessor.destroy()
    })

    it('should group items by key', async () => {
      const keyedProcessor = new BatchProcessor<{ key: string; value: number }, number>({
        maxBatchSize: 2,
        maxWaitMs: 50,
        keyResolver: (item) => item.key,
        processBatch: async (items) => {
          return items.map(x => x.value * 2)
        },
      })

      const results = await Promise.all([
        keyedProcessor.add({ key: 'A', value: 1 }),
        keyedProcessor.add({ key: 'B', value: 2 }),
        keyedProcessor.add({ key: 'A', value: 3 }),
        keyedProcessor.add({ key: 'B', value: 4 }),
      ])

      expect(results).toEqual([2, 4, 6, 8])
      await keyedProcessor.destroy()
    })
  })

  describe('flush', () => {
    it('should process pending items immediately', async () => {
      let processed = false
      const slowProcessor = new BatchProcessor<number, number>({
        maxBatchSize: 10,
        maxWaitMs: 5000, // Very long wait
        processBatch: async (items) => {
          processed = true
          return items.map(x => x * 2)
        },
      })

      const promise = slowProcessor.add(5)
      expect(processed).toBe(false)

      await slowProcessor.flush()
      expect(processed).toBe(true)

      const result = await promise
      expect(result).toBe(10)

      await slowProcessor.destroy()
    })
  })

  describe('getPendingCount', () => {
    it('should return count of pending items', async () => {
      const slowProcessor = new BatchProcessor<number, number>({
        maxBatchSize: 10,
        maxWaitMs: 1000,
        processBatch: async (items) => items.map(x => x * 2),
      })

      // Add items without awaiting
      slowProcessor.add(1)
      slowProcessor.add(2)

      // Small delay to let items be added to queue
      await new Promise(resolve => setTimeout(resolve, 10))

      // Should have pending items
      expect(slowProcessor.getPendingCount()).toBeGreaterThan(0)

      // Clean up without checking rejected promises
      slowProcessor.timers.forEach(timer => clearTimeout(timer))
      slowProcessor.timers.clear()
      slowProcessor.pending.clear()
    })
  })

  describe('error handling', () => {
    it('should reject all requests on batch failure', async () => {
      const errorProcessor = new BatchProcessor<number, number>({
        maxBatchSize: 2,
        maxWaitMs: 50,
        processBatch: async () => {
          throw new Error('Batch processing failed')
        },
      })

      try {
        await Promise.all([
          errorProcessor.add(1),
          errorProcessor.add(2),
        ])
        expect(false).toBe(true) // Should not reach here
      } catch (error) {
        expect(error instanceof Error).toBe(true)
        expect((error as Error).message).toBe('Batch processing failed')
      }

      await errorProcessor.destroy()
    })
  })
})

describe('batchAsync', () => {
  it('should process items in batches', async () => {
    const items = [1, 2, 3, 4, 5]
    const results = await batchAsync(
      items,
      async (batch) => batch.map(x => x * 2),
      2
    )
    expect(results).toEqual([2, 4, 6, 8, 10])
  })

  it('should handle empty array', async () => {
    const results = await batchAsync(
      [],
      async (batch) => batch.map(x => x * 2),
      2
    )
    expect(results).toEqual([])
  })

  it('should handle batch larger than items', async () => {
    const items = [1, 2]
    const results = await batchAsync(
      items,
      async (batch) => batch.map(x => x * 2),
      10
    )
    expect(results).toEqual([2, 4])
  })
})

describe('RequestDeduplicator', () => {
  let deduplicator: RequestDeduplicator<string, number>

  beforeEach(() => {
    deduplicator = new RequestDeduplicator<string, number>()
  })

  describe('execute', () => {
    it('should execute function and return result', async () => {
      const fn = async () => 42
      const result = await deduplicator.execute('key1', fn)
      expect(result).toBe(42)
    })

    it('should deduplicate concurrent requests', async () => {
      let callCount = 0
      const slowFn = async () => {
        callCount++
        await new Promise(resolve => setTimeout(resolve, 50))
        return 42
      }

      // Start multiple requests with same key
      const promise1 = deduplicator.execute('same-key', slowFn)
      const promise2 = deduplicator.execute('same-key', slowFn)
      const promise3 = deduplicator.execute('same-key', slowFn)

      const results = await Promise.all([promise1, promise2, promise3])

      // Should only call function once
      expect(callCount).toBe(1)
      expect(results).toEqual([42, 42, 42])
    })

    it('should allow new requests after completion', async () => {
      let callCount = 0
      const fn = async () => {
        callCount++
        return callCount
      }

      // First request
      const result1 = await deduplicator.execute('key', fn)
      expect(result1).toBe(1)

      // Second request (after first completed)
      const result2 = await deduplicator.execute('key', fn)
      expect(result2).toBe(2)

      expect(callCount).toBe(2)
    })

    it('should handle different keys independently', async () => {
      let callCount = 0
      const fn = async () => {
        callCount++
        return callCount
      }

      const result1 = await deduplicator.execute('key1', fn)
      const result2 = await deduplicator.execute('key2', fn)

      expect(callCount).toBe(2)
      expect(result1).toBe(1)
      expect(result2).toBe(2)
    })
  })

  describe('isPending', () => {
    it('should return true for pending requests', async () => {
      const slowFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return 42
      }

      // Start request but don't await
      deduplicator.execute('key', slowFn)

      expect(deduplicator.isPending('key')).toBe(true)

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 60))
      expect(deduplicator.isPending('key')).toBe(false)
    })
  })

  describe('getPendingCount', () => {
    it('should return count of pending deduplicated requests', async () => {
      const slowFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return 42
      }

      expect(deduplicator.getPendingCount()).toBe(0)

      // Start multiple requests
      deduplicator.execute('key1', slowFn)
      deduplicator.execute('key2', slowFn)

      // Should have 2 pending (different keys)
      expect(deduplicator.getPendingCount()).toBe(2)
    })
  })
})

describe('globalDeduplicator', () => {
  it('should be shared instance', () => {
    expect(globalDeduplicator).toBeDefined()
    expect(typeof globalDeduplicator.execute).toBe('function')
  })
})

describe('withDeduplication', () => {
  it('should wrap function with deduplication', async () => {
    let callCount = 0
    const fn = async (x: number) => {
      callCount++
      await new Promise(resolve => setTimeout(resolve, 10))
      return x * 2
    }

    const wrapped = withDeduplication(fn, (x) => `key-${x}`)

    // Multiple calls with same argument
    const results = await Promise.all([
      wrapped(5),
      wrapped(5),
      wrapped(5),
    ])

    expect(callCount).toBe(1)
    expect(results).toEqual([10, 10, 10])
  })
})

describe('BatchPresets', () => {
  it('should have correct fast preset', () => {
    expect(BatchPresets.fast.maxBatchSize).toBe(5)
    expect(BatchPresets.fast.maxWaitMs).toBe(50)
  })

  it('should have correct balanced preset', () => {
    expect(BatchPresets.balanced.maxBatchSize).toBe(10)
    expect(BatchPresets.balanced.maxWaitMs).toBe(100)
  })

  it('should have correct throughput preset', () => {
    expect(BatchPresets.throughput.maxBatchSize).toBe(50)
    expect(BatchPresets.throughput.maxWaitMs).toBe(500)
  })

  it('should have correct background preset', () => {
    expect(BatchPresets.background.maxBatchSize).toBe(100)
    expect(BatchPresets.background.maxWaitMs).toBe(1000)
  })
})
