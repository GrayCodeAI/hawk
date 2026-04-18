/**
 * Request batching utilities for efficient API calls
 * Groups multiple requests into single batch operations
 */

import { SECOND } from '../constants/numbers.js'
import { logForDebugging } from './log.js'

/**
 * Configuration for batch processor
 */
export interface BatchConfig<T, R> {
  /** Maximum number of requests per batch */
  maxBatchSize: number
  /** Maximum time to wait before processing batch (ms) */
  maxWaitMs: number
  /** Function to process a batch of requests */
  processBatch: (items: T[]) => Promise<R[]>
  /** Optional key resolver for grouping related requests */
  keyResolver?: (item: T) => string
}

/**
 * Pending request in the batch queue
 */
interface PendingRequest<T, R> {
  item: T
  resolve: (value: R) => void
  reject: (reason: unknown) => void
  timestamp: number
}

/**
 * Batch processor that groups requests for efficient processing
 * Reduces API calls by batching multiple requests together
 */
export class BatchProcessor<T, R> {
  private config: BatchConfig<T, R>
  private pending = new Map<string, PendingRequest<T, R>[]>()
  private timers = new Map<string, Timer>()
  private processing = new Set<string>()

  constructor(config: BatchConfig<T, R>) {
    this.config = {
      keyResolver: () => 'default',
      ...config,
    }
  }

  /**
   * Add a request to the batch queue
   * @param item - Request item to batch
   * @returns Promise that resolves with the result
   */
  async add(item: T): Promise<R> {
    const key = this.config.keyResolver!(item)

    return new Promise((resolve, reject) => {
      const request: PendingRequest<T, R> = {
        item,
        resolve,
        reject,
        timestamp: Date.now(),
      }

      // Add to pending queue
      if (!this.pending.has(key)) {
        this.pending.set(key, [])
      }
      this.pending.get(key)!.push(request)

      // Check if we should process immediately
      if (this.pending.get(key)!.length >= this.config.maxBatchSize) {
        this.processBatch(key)
      } else {
        // Schedule batch processing
        this.scheduleProcessing(key)
      }
    })
  }

  /**
   * Schedule batch processing after maxWaitMs
   */
  private scheduleProcessing(key: string): void {
    if (this.timers.has(key)) {
      return // Already scheduled
    }

    const timer = setTimeout(() => {
      this.processBatch(key)
    }, this.config.maxWaitMs)

    this.timers.set(key, timer)
  }

  /**
   * Process a batch of pending requests
   */
  private async processBatch(key: string): Promise<void> {
    // Prevent concurrent processing of same key
    if (this.processing.has(key)) {
      return
    }

    // Clear timer if exists
    const timer = this.timers.get(key)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(key)
    }

    // Get pending requests
    const requests = this.pending.get(key)
    if (!requests || requests.length === 0) {
      return
    }

    this.processing.add(key)
    this.pending.delete(key)

    try {
      logForDebugging(
        `Processing batch of ${requests.length} requests for key: ${key}`,
        { level: 'debug' }
      )

      // Extract items
      const items = requests.map(r => r.item)

      // Process batch
      const results = await this.config.processBatch(items)

      // Resolve each request with its result
      requests.forEach((request, index) => {
        const result = results[index]
        if (result !== undefined) {
          request.resolve(result)
        } else {
          request.reject(new Error('No result returned for request'))
        }
      })
    } catch (error) {
      // Reject all requests on batch failure
      requests.forEach(request => {
        request.reject(error)
      })
    } finally {
      this.processing.delete(key)
    }
  }

  /**
   * Flush all pending batches immediately
   */
  async flush(): Promise<void> {
    const keys = Array.from(this.pending.keys())
    await Promise.all(keys.map(key => this.processBatch(key)))
  }

  /**
   * Get current pending count
   */
  getPendingCount(): number {
    let count = 0
    for (const requests of this.pending.values()) {
      count += requests.length
    }
    return count
  }

  /**
   * Destroy the batch processor
   * Flushes pending requests and cleans up
   */
  async destroy(): Promise<void> {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer)
    }
    this.timers.clear()

    // Reject pending requests
    for (const requests of this.pending.values()) {
      for (const request of requests) {
        request.reject(new Error('Batch processor destroyed'))
      }
    }
    this.pending.clear()
  }
}

/**
 * Utility to batch multiple async operations
 * Groups promises and executes them in batches
 */
export async function batchAsync<T, R>(
  items: T[],
  processFn: (batch: T[]) => Promise<R[]>,
  batchSize: number = 10
): Promise<R[]> {
  const results: R[] = []

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await processFn(batch)
    results.push(...batchResults)
  }

  return results
}

/**
 * Debounce multiple calls into a single execution
 * Useful for deduplicating concurrent requests
 */
export class RequestDeduplicator<T, R> {
  private pending = new Map<string, Promise<R>>()

  /**
   * Execute a function, deduplicating concurrent calls with the same key
   * @param key - Deduplication key
   * @param fn - Function to execute
   * @returns Promise with the result
   */
  async execute(key: string, fn: () => Promise<R>): Promise<R> {
    // Check if there's already a pending request
    const existing = this.pending.get(key)
    if (existing) {
      logForDebugging(`Deduplicating request for key: ${key}`, { level: 'debug' })
      return existing
    }

    // Create new promise
    const promise = fn().finally(() => {
      this.pending.delete(key)
    })

    this.pending.set(key, promise)
    return promise
  }

  /**
   * Check if a request is pending for the given key
   */
  isPending(key: string): boolean {
    return this.pending.has(key)
  }

  /**
   * Get count of pending deduplicated requests
   */
  getPendingCount(): number {
    return this.pending.size
  }
}

/**
 * Global deduplicator instance for common use cases
 */
export const globalDeduplicator = new RequestDeduplicator<string, unknown>()

/**
 * Higher-order function to add deduplication to async functions
 */
export function withDeduplication<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  keyResolver: (...args: Parameters<T>) => string
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  const deduplicator = new RequestDeduplicator<string, ReturnType<T>>()

  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const key = keyResolver(...args)
    return deduplicator.execute(key, () => fn(...args) as Promise<ReturnType<T>>)
  }
}

/**
 * Batch configuration presets for common use cases
 */
export const BatchPresets = {
  /** Fast, small batches for responsive UI */
  fast: { maxBatchSize: 5, maxWaitMs: 50 },
  /** Balanced for general API calls */
  balanced: { maxBatchSize: 10, maxWaitMs: 100 },
  /** Large batches for high throughput */
  throughput: { maxBatchSize: 50, maxWaitMs: 500 },
  /** Aggressive batching for background jobs */
  background: { maxBatchSize: 100, maxWaitMs: SECOND },
} as const
