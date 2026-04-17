/**
 * Memoization utilities for expensive operations
 */

import memoize from 'lodash-es/memoize.js';

/**
 * Memoizes a function with a custom cache key generator
 * @param fn - The function to memoize
 * @param keyResolver - Function to generate cache key from arguments
 * @returns Memoized function
 */
export function memoizeWithKey<T extends (...args: any[]) => any>(
  fn: T,
  keyResolver: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  const memoized = ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyResolver(...args);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;

  // Expose cache for testing and clearing
  (memoized as any).cache = cache;

  return memoized;
}

/**
 * Memoizes a function with a TTL (time-to-live)
 * @param fn - The function to memoize
 * @param ttlMs - Time to live in milliseconds
 * @returns Memoized function with TTL
 */
export function memoizeWithTTL<T extends (...args: any[]) => any>(
  fn: T,
  ttlMs: number
): T & { clear: () => void } {
  const cache = new Map<string, { value: ReturnType<T>; expires: number }>();

  const memoized = ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }

    // Clear expired entries periodically
    if (cached) {
      cache.delete(key);
    }

    const result = fn(...args);
    cache.set(key, { value: result, expires: Date.now() + ttlMs });
    return result;
  }) as T & { clear: () => void };

  memoized.clear = () => cache.clear();

  return memoized;
}

/**
 * Async memoization with error handling
 * Memoizes successful results, but retries on failure
 * @param fn - The async function to memoize
 * @param keyResolver - Function to generate cache key from arguments
 * @returns Memoized async function
 */
export function memoizeAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyResolver: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, Promise<Awaited<ReturnType<T>>>>();

  return (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const key = keyResolver(...args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const promise = fn(...args).catch(error => {
      // Remove from cache on error so next call retries
      cache.delete(key);
      throw error;
    });

    cache.set(key, promise);
    return promise;
  }) as T;
}

/**
 * Simple once-per-process memoization for expensive initialization
 * @param fn - The initialization function
 * @returns Memoized result
 */
export function once<T extends () => ReturnType<T>>(fn: T): () => ReturnType<T> {
  let result: ReturnType<T>;
  let called = false;

  return (): ReturnType<T> => {
    if (!called) {
      result = fn();
      called = true;
    }
    return result;
  };
}

// Re-export lodash memoize for compatibility
export { memoize };

/**
 * Memoizes an async function with a TTL (time-to-live)
 * Similar to memoizeWithTTL but for async functions
 * @param fn - The async function to memoize
 * @param keyResolver - Function to generate cache key from arguments
 * @param ttlMs - Time to live in milliseconds
 * @returns Memoized async function with TTL
 */
export function memoizeWithTTLAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyResolver: (...args: Parameters<T>) => string,
  ttlMs: number
): T & { clear: () => void } {
  const cache = new Map<string, { value: Awaited<ReturnType<T>>; expires: number }>();

  const memoized = (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const key = keyResolver(...args);
    const cached = cache.get(key);
    
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }

    // Clear expired entry
    if (cached) {
      cache.delete(key);
    }

    const result = await fn(...args);
    cache.set(key, { value: result, expires: Date.now() + ttlMs });
    return result;
  }) as T & { clear: () => void };

  memoized.clear = () => cache.clear();

  return memoized;
}

/**
 * LRU cache entry
 */
interface LRUCacheEntry<V> {
  value: V;
  lastAccess: number;
}

/**
 * Memoizes a function with an LRU (Least Recently Used) cache.
 * When the cache is full, the least recently accessed entry is evicted.
 * 
 * @param fn - The function to memoize
 * @param keyResolver - Function to generate cache key from arguments
 * @param maxSize - Maximum number of entries to cache
 * @returns Memoized function with LRU cache
 */
export function memoizeWithLRU<T extends (...args: any[]) => any>(
  fn: T,
  keyResolver: (...args: Parameters<T>) => string,
  maxSize: number
): T & { cache: Map<string, LRUCacheEntry<ReturnType<T>>> } {
  const cache = new Map<string, LRUCacheEntry<ReturnType<T>>>();

  const memoized = ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyResolver(...args);
    const cached = cache.get(key);

    if (cached) {
      // Update last access time and re-insert to update Map iteration order
      cached.lastAccess = Date.now();
      // Delete and re-set to update iteration order (most recent at end)
      cache.delete(key);
      cache.set(key, cached);
      return cached.value;
    }

    // Evict oldest entry if cache is full
    if (cache.size >= maxSize) {
      // First entry in Map is the oldest (we maintain insertion order by re-inserting on access)
      const firstKey = cache.keys().next().value;
      if (firstKey) {
        cache.delete(firstKey);
      }
    }

    const result = fn(...args);
    cache.set(key, { value: result, lastAccess: Date.now() });
    return result;
  }) as T & { cache: Map<string, LRUCacheEntry<ReturnType<T>>> };

  memoized.cache = cache;

  return memoized;
}
