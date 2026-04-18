/**
 * E2E Tests for Error Recovery
 */

import { describe, expect, it } from 'bun:test'
import { toError, errorMessage } from '../../src/utils/errors.js'

describe('Error Recovery E2E', () => {
  it('should recover from different error types', () => {
    const errors = [
      new Error('standard error'),
      'string error',
      { message: 'object error' },
      42,
      null,
    ]

    errors.forEach(err => {
      const normalized = toError(err)
      expect(normalized).toBeInstanceOf(Error)
      expect(errorMessage(normalized)).toBeDefined()
    })
  })

  it('should handle nested error causes', () => {
    const cause = new Error('root cause')
    const error = new Error('outer error', { cause })

    expect(error.cause).toBe(cause)
    expect(errorMessage(error)).toBe('outer error')
  })
})
