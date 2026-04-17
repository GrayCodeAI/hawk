import { describe, expect, test } from 'bun:test';
import {
  memoizeWithKey,
  memoizeWithTTL,
  memoizeWithTTLAsync,
  memoizeAsync,
  once,
  memoizeWithLRU,
} from './memoize.js';

describe('memoizeWithKey', () => {
  test('caches results based on key', () => {
    let callCount = 0;
    const fn = (x: number, y: number): number => {
      callCount++;
      return x + y;
    };

    const memoized = memoizeWithKey(fn, (x, y) => `${x},${y}`);

    expect(memoized(1, 2)).toBe(3);
    expect(memoized(1, 2)).toBe(3);
    expect(callCount).toBe(1);

    expect(memoized(2, 3)).toBe(5);
    expect(callCount).toBe(2);
  });

  test('exposes cache for inspection', () => {
    const fn = (x: number): number => x * 2;
    const memoized = memoizeWithKey(fn, x => String(x));

    memoized(5);
    expect((memoized as any).cache.has('5')).toBe(true);
  });
});

describe('memoizeWithTTL', () => {
  test('caches results within TTL', () => {
    let callCount = 0;
    const fn = (): number => {
      callCount++;
      return Date.now();
    };

    const memoized = memoizeWithTTL(fn, 1000);
    const result1 = memoized();
    const result2 = memoized();

    expect(result1).toBe(result2);
    expect(callCount).toBe(1);
  });

  test('refreshes after TTL expires', async () => {
    let callCount = 0;
    const fn = (): number => {
      callCount++;
      return callCount;
    };

    const memoized = memoizeWithTTL(fn, 10);
    const result1 = memoized();
    await new Promise(resolve => setTimeout(resolve, 20));
    const result2 = memoized();

    expect(result1).toBe(1);
    expect(result2).toBe(2);
  });

  test('clear resets cache', () => {
    let callCount = 0;
    const fn = (): number => ++callCount;

    const memoized = memoizeWithTTL(fn, 1000);
    memoized();
    memoized.clear();
    memoized();

    expect(callCount).toBe(2);
  });
});

describe('memoizeWithTTLAsync', () => {
  test('caches async results within TTL', async () => {
    let callCount = 0;
    const fn = async (): Promise<number> => {
      callCount++;
      return Date.now();
    };

    const memoized = memoizeWithTTLAsync(fn, () => 'key', 1000);
    const result1 = await memoized();
    const result2 = await memoized();

    expect(result1).toBe(result2);
    expect(callCount).toBe(1);
  });

  test('refreshes after TTL expires', async () => {
    let callCount = 0;
    const fn = async (): Promise<number> => {
      callCount++;
      return callCount;
    };

    const memoized = memoizeWithTTLAsync(fn, () => 'key', 10);
    const result1 = await memoized();
    await new Promise(resolve => setTimeout(resolve, 20));
    const result2 = await memoized();

    expect(result1).toBe(1);
    expect(result2).toBe(2);
  });
});

describe('memoizeAsync', () => {
  test('caches successful async results', async () => {
    let callCount = 0;
    const fn = async (x: number): Promise<number> => {
      callCount++;
      return x * 2;
    };

    const memoized = memoizeAsync(fn, x => String(x));

    const result1 = await memoized(5);
    const result2 = await memoized(5);

    expect(result1).toBe(10);
    expect(result2).toBe(10);
    expect(callCount).toBe(1);
  });

  test('retries on failure', async () => {
    let shouldFail = true;
    const fn = async (): Promise<string> => {
      if (shouldFail) {
        throw new Error('Failed');
      }
      return 'success';
    };

    const memoized = memoizeAsync(fn, () => 'key');

    await expect(memoized()).rejects.toThrow('Failed');

    shouldFail = false;
    const result = await memoized();
    expect(result).toBe('success');
  });
});

describe('once', () => {
  test('calls function only once', () => {
    let callCount = 0;
    const fn = (): number => ++callCount;

    const onceFn = once(fn);

    expect(onceFn()).toBe(1);
    expect(onceFn()).toBe(1);
    expect(onceFn()).toBe(1);
    expect(callCount).toBe(1);
  });

  test('returns same result', () => {
    const fn = (): object => ({ timestamp: Date.now() });
    const onceFn = once(fn);

    const result1 = onceFn();
    const result2 = onceFn();

    expect(result1).toBe(result2);
  });
});

describe('memoizeWithLRU', () => {
  test('caches results', () => {
    let callCount = 0;
    const fn = (x: number): number => {
      callCount++;
      return x * 2;
    };

    const memoized = memoizeWithLRU(fn, x => String(x), 3);

    expect(memoized(1)).toBe(2);
    expect(memoized(1)).toBe(2);
    expect(callCount).toBe(1);
  });

  test('evicts least recently used when cache is full', () => {
    const keys: string[] = [];
    const fn = (x: number): number => {
      keys.push(String(x));
      return x;
    };

    const memoized = memoizeWithLRU(fn, x => String(x), 2);

    memoized(1);
    memoized(2);
    memoized(1); // Access 1 to make it more recent
    memoized(3); // Should evict 2

    expect(keys).toEqual(['1', '2', '3']);
    expect(memoized.cache.has('1')).toBe(true);
    expect(memoized.cache.has('2')).toBe(false);
    expect(memoized.cache.has('3')).toBe(true);
  });

  test('updates access time on cache hit', () => {
    let callCount = 0;
    const fn = (x: number): number => {
      callCount++;
      return x;
    };

    const memoized = memoizeWithLRU(fn, x => String(x), 2);

    memoized(1);
    memoized(2);
    memoized(1); // Touch 1
    memoized(3); // Should evict 2, not 1

    expect(memoized(1)).toBe(1); // Should not call fn again
    expect(memoized(2)).toBe(2); // Should call fn again
    expect(callCount).toBe(4); // 1, 2, 3, 2
  });
});
