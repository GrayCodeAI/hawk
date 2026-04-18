/**
 * E2E Tests for Authentication Flow
 */

import { describe, expect, it } from 'bun:test'
import { isValidApiKey } from '../../src/utils/auth.js'

describe('Authentication Flow E2E', () => {
  it('should validate API key format', () => {
    expect(isValidApiKey('sk-test123')).toBe(true)
    expect(isValidApiKey('test-key_456')).toBe(true)
    expect(isValidApiKey('invalid key with spaces')).toBe(false)
    expect(isValidApiKey('invalid@symbol')).toBe(false)
  })

  it('should reject empty or invalid API keys', () => {
    expect(isValidApiKey('')).toBe(false)
    expect(isValidApiKey('   ')).toBe(false)
    expect(isValidApiKey('key with\nnewline')).toBe(false)
  })
})
