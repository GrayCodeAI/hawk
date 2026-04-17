import { describe, expect, test } from 'bun:test';
import {
  sanitizeString,
  sanitizeObject,
  sanitizeForLogging,
  sanitizeError,
  sanitizeUrl,
  sanitizeHeaders,
} from './sanitize.js';

describe('sanitizeString', () => {
  test('redacts credit card numbers', () => {
    const input = 'Card: 1234 5678 9012 3456';
    const result = sanitizeString(input);
    expect(result).toContain('[REDACTED');
  });

  test('redacts email addresses', () => {
    const input = 'Contact: user@example.com';
    expect(sanitizeString(input)).toContain('[REDACTED');
  });

  test('handles null/undefined', () => {
    expect(sanitizeString(null as unknown as string)).toBeNull();
    expect(sanitizeString(undefined as unknown as string)).toBeUndefined();
  });

  test('leaves safe strings unchanged', () => {
    const input = 'Hello world, this is safe text';
    expect(sanitizeString(input)).toBe(input);
  });
});

describe('sanitizeObject', () => {
  test('sanitizes nested objects', () => {
    const input = {
      name: 'test',
      email: 'test@example.com',
      nested: {
        ssn: '123-45-6789',
      },
    };

    const result = sanitizeObject(input);
    expect(result.email).toContain('[REDACTED');
    expect(result.nested.ssn).toContain('[REDACTED');
    expect(result.name).toBe('test');
  });

  test('handles arrays', () => {
    const input = [
      { card: '1234 5678 9012 3456' },
      { card: 'safe value' },
    ];

    const result = sanitizeObject(input);
    expect(result[0].card).toContain('[REDACTED');
    expect(result[1].card).toBe('safe value');
  });

  test('handles primitives', () => {
    expect(sanitizeObject('string')).toContain('string');
    expect(sanitizeObject(123)).toBe(123);
    expect(sanitizeObject(true)).toBe(true);
  });

  test('handles dates', () => {
    const date = new Date('2024-01-01');
    expect(sanitizeObject(date)).toEqual(date);
  });
});

describe('sanitizeForLogging', () => {
  test('truncates long strings', () => {
    const input = { text: 'a'.repeat(2000) };
    const result = sanitizeForLogging(input, 100);

    expect(result.text).toContain('[truncated');
    expect(result.text.length).toBeLessThan(200);
  });

  test('truncates large arrays', () => {
    const input = { items: Array(150).fill('item') };
    const result = sanitizeForLogging(input);

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(101);
  });
});

describe('sanitizeError', () => {
  test('sanitizes error message', () => {
    const error = new Error('Failed with email test@example.com');
    const result = sanitizeError(error);

    expect(result.message).toContain('[REDACTED');
    expect(result.name).toBe('Error');
  });

  test('preserves error properties', () => {
    const error = new Error('Test error') as Error & { code: string };
    error.code = 'TEST_CODE';
    const result = sanitizeError(error) as Error & { code: string };

    expect(result.code).toBe('TEST_CODE');
  });
});

describe('sanitizeUrl', () => {
  test('removes sensitive query params', () => {
    const url = 'https://example.com/api?token=DEMO_VALUE&name=test';
    const result = sanitizeUrl(url);

    // URL encoding converts [REDACTED] to %5BREDACTED%5D
    expect(result).toContain('REDACTED');
    expect(result).not.toContain('DEMO_VALUE');
    expect(result).toContain('name=test');
  });

  test('handles malformed URLs gracefully', () => {
    const url = 'not-a-valid-url with some text';
    const result = sanitizeUrl(url);

    expect(result).toBe(url);
  });
});

describe('sanitizeHeaders', () => {
  test('removes authorization headers', () => {
    const headers = {
      'Authorization': 'Bearer DEMO_TOKEN',
      'Content-Type': 'application/json',
      'Cookie': 'session=DEMO_SESSION',
    };

    const result = sanitizeHeaders(headers);

    expect(result.Authorization).toBe('[REDACTED]');
    expect(result.Cookie).toBe('[REDACTED]');
    expect(result['Content-Type']).toBe('application/json');
  });

  test('handles undefined values', () => {
    const headers = {
      'X-Custom': undefined,
      'Content-Type': 'application/json',
    };

    const result = sanitizeHeaders(headers);

    expect(result['X-Custom']).toBeUndefined();
    expect(result['Content-Type']).toBe('application/json');
  });
});
