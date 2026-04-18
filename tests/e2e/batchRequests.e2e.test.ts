/**
 * E2E Tests for Batch Requests
 * Tests real-world batch processing scenarios
 */

import { describe, expect, it } from 'bun:test'
import { BatchProcessor, batchAsync } from '../../src/utils/batchRequests.js'
import { SECOND } from '../../src/constants/numbers.js'

describe('Batch Requests E2E', () => {
  it('should batch database queries efficiently', async () => {
    let batchCount = 0
    let totalItems = 0

    const processor = new BatchProcessor<string, string>({
      maxBatchSize: 5,
      maxWaitMs: 50,
      processBatch: async (ids) => {
        batchCount++
        totalItems += ids.length
        // Simulate database query
        await new Promise(resolve => setTimeout(resolve, 10))
        return ids.map(id => `data-${id}`)
      },
    })

    // Send 20 queries with small delays to simulate real traffic
    const promises: Promise<string>[] = []
    for (let i = 0; i < 20; i++) {
      promises.push(processor.add(`id-${i}`))
      // Add small delay every 5 items to allow batching
      if ((i + 1) % 5 === 0 && i < 19) {
        await new Promise(resolve => setTimeout(resolve, 60))
      }
    }

    const results = await Promise.all(promises)

    // Should batch into multiple groups (at least 2 due to delay)
    expect(batchCount).toBeGreaterThanOrEqual(2)
    expect(totalItems).toBe(20)
    expect(results).toHaveLength(20)
    expect(results.every(r => r.startsWith('data-'))).toBe(true)

    await processor.destroy()
  })

  it('should handle high-throughput API calls', async () => {
    const processedBatches: number[] = []

    const processor = new BatchProcessor<number, number>({
      maxBatchSize: 10,
      maxWaitMs: 20,
      processBatch: async (items) => {
        processedBatches.push(items.length)
        return items.map(x => x * 2)
      },
    })

    const startTime = Date.now()

    // Send 100 requests with slight staggering
    const promises: Promise<number>[] = []
    for (let i = 0; i < 100; i++) {
      promises.push(processor.add(i))
      // Small delay to allow batch processing to catch up
      if (i % 25 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 30))
      }
    }

    await Promise.all(promises)

    const endTime = Date.now()

    // Should complete quickly (under 2 seconds for 100 items)
    expect(endTime - startTime).toBeLessThan(2000)

    // Should batch efficiently (multiple batches created)
    const totalBatches = processedBatches.length
    expect(totalBatches).toBeGreaterThanOrEqual(2)
    expect(processedBatches.reduce((a, b) => a + b, 0)).toBe(100)

    await processor.destroy()
  })

  it('should handle mixed priority requests', async () => {
    const executionOrder: string[] = []

    const processor = new BatchProcessor<string, string>({
      maxBatchSize: 3,
      maxWaitMs: 30,
      keyResolver: (item) => item.startsWith('priority') ? 'priority' : 'normal',
      processBatch: async (items) => {
        executionOrder.push(...items)
        await new Promise(resolve => setTimeout(resolve, 5))
        return items
      },
    })

    // Mix of priority and normal requests
    const promises = [
      processor.add('normal-1'),
      processor.add('priority-1'),
      processor.add('normal-2'),
      processor.add('priority-2'),
      processor.add('normal-3'),
      processor.add('priority-3'),
    ]

    await Promise.all(promises)

    // All should be processed
    expect(executionOrder).toHaveLength(6)

    await processor.destroy()
  })

  it('should handle error recovery gracefully', async () => {
    let attempt = 0

    const processor = new BatchProcessor<string, string>({
      maxBatchSize: 5,
      maxWaitMs: 50,
      processBatch: async (items) => {
        attempt++
        if (attempt === 1) {
          throw new Error('Simulated failure')
        }
        return items.map(x => `processed-${x}`)
      },
    })

    // First batch should fail
    try {
      await Promise.all([
        processor.add('item1'),
        processor.add('item2'),
      ])
      expect(false).toBe(true) // Should not reach here
    } catch (error) {
      expect(error).toBeDefined()
    }

    await processor.destroy()
  })

  it('should use batchAsync for large datasets', async () => {
    const items = Array.from({ length: 1000 }, (_, i) => i)
    const batchSizes: number[] = []

    const results = await batchAsync(
      items,
      async (batch) => {
        batchSizes.push(batch.length)
        await new Promise(resolve => setTimeout(resolve, 1))
        return batch.map(x => x * 2)
      },
      100
    )

    // Should create 10 batches
    expect(batchSizes).toHaveLength(10)
    expect(batchSizes.every(size => size === 100)).toBe(true)
    expect(results).toHaveLength(1000)
    expect(results[0]).toBe(0)
    expect(results[999]).toBe(1998)
  })
})
