/**
 * E2E Tests for Error Handling
 * Tests custom error classes and error utilities
 */

import { describe, expect, it } from 'bun:test'
import {
  ContentBlockError,
  StreamTimeoutError,
  FileOperationError,
  ValidationError,
  RateLimitError,
  isAbortError,
  toError,
  errorMessage,
  getErrnoCode,
  isENOENT,
  isFsInaccessible,
} from '../../src/utils/errors.js'

describe('Error Handling E2E', () => {
  it('should create ContentBlockError with details', () => {
    const error = new ContentBlockError('text', 'connector_text')
    expect(error.message).toBe('Expected text block, received connector_text')
    expect(error.expectedType).toBe('text')
    expect(error.actualType).toBe('connector_text')
    expect(error.name).toBe('ContentBlockError')
  })

  it('should create StreamTimeoutError with duration', () => {
    const error = new StreamTimeoutError('no chunks received', 30000)
    expect(error.message).toBe('Stream timeout: no chunks received after 30000ms')
    expect(error.reason).toBe('no chunks received')
    expect(error.duration).toBe(30000)
  })

  it('should create FileOperationError with context', () => {
    const error = new FileOperationError('permission denied', '/path/to/file.txt', 'read')
    expect(error.message).toBe('read failed for /path/to/file.txt: permission denied')
    expect(error.filePath).toBe('/path/to/file.txt')
    expect(error.operation).toBe('read')
  })

  it('should create ValidationError with field info', () => {
    const error = new ValidationError('Invalid input', 'email', 'invalid-email')
    expect(error.message).toBe('Invalid input')
    expect(error.field).toBe('email')
    expect(error.value).toBe('invalid-email')
  })

  it('should create RateLimitError with retry info', () => {
    const error = new RateLimitError('Too many requests', 60, 'requests')
    expect(error.message).toBe('Too many requests')
    expect(error.retryAfter).toBe(60)
    expect(error.limitType).toBe('requests')
  })

  it('should detect abort errors', () => {
    const abortError = new Error('Aborted')
    abortError.name = 'AbortError'
    expect(isAbortError(abortError)).toBe(true)

    const regularError = new Error('Regular error')
    expect(isAbortError(regularError)).toBe(false)
  })

  it('should convert to Error', () => {
    const fromString = toError('string error')
    expect(fromString).toBeInstanceOf(Error)
    expect(fromString.message).toBe('string error')

    const fromError = toError(new Error('existing error'))
    expect(fromError.message).toBe('existing error')

    const fromObject = toError({ message: 'object error' })
    expect(fromObject.message).toBe('[object Object]')
  })

  it('should extract error messages', () => {
    expect(errorMessage(new Error('test'))).toBe('test')
    expect(errorMessage('string')).toBe('string')
    expect(errorMessage(123)).toBe('123')
    expect(errorMessage(null)).toBe('null')
  })

  it('should detect ENOENT errors', () => {
    const enoentError = { code: 'ENOENT' }
    expect(getErrnoCode(enoentError)).toBe('ENOENT')
    expect(isENOENT(enoentError)).toBe(true)

    const otherError = { code: 'EACCES' }
    expect(isENOENT(otherError)).toBe(false)

    expect(isENOENT(null)).toBe(false)
    expect(isENOENT('string')).toBe(false)
  })

  it('should detect filesystem inaccessible errors', () => {
    expect(isFsInaccessible({ code: 'ENOENT' })).toBe(true)
    expect(isFsInaccessible({ code: 'EACCES' })).toBe(true)
    expect(isFsInaccessible({ code: 'EPERM' })).toBe(true)
    expect(isFsInaccessible({ code: 'ENOTDIR' })).toBe(true)
    expect(isFsInaccessible({ code: 'ELOOP' })).toBe(true)
    expect(isFsInaccessible({ code: 'ECONNREFUSED' })).toBe(false)
  })
})
