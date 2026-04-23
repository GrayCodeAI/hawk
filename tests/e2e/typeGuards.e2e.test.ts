/**
 * E2E Tests for Type Guards
 * Tests runtime type validation
 */

import { describe, expect, it } from 'bun:test'
import {
  isFileEditOutput,
  isFileWriteOutput,
  isToolResult,
  assertType,
  assertTypeWithFallback,
} from '../../src/utils/typeGuards.js'

describe('Type Guards E2E', () => {
  it('should validate FileEditOutput correctly', () => {
    const validOutput = {
      filePath: '/path/to/file.txt',
      oldString: 'old content',
      newString: 'new content',
      originalFile: 'old content',
      structuredPatch: [],
      userModified: false,
      replaceAll: false,
    }

    expect(isFileEditOutput(validOutput)).toBe(true)

    const invalidOutput = {
      filePath: '/path/to/file.txt',
      oldString: 'old content',
      // missing fields
    }

    expect(isFileEditOutput(invalidOutput)).toBe(false)
    expect(isFileEditOutput(null)).toBe(false)
    expect(isFileEditOutput('string')).toBe(false)
  })

  it('should validate FileWriteOutput correctly', () => {
    const validCreate = {
      type: 'create' as const,
      filePath: '/path/to/file.txt',
      content: 'content',
      structuredPatch: [],
      originalFile: null,
    }

    const validUpdate = {
      type: 'update' as const,
      filePath: '/path/to/file.txt',
      content: 'content',
      structuredPatch: [],
      originalFile: 'old content',
    }

    expect(isFileWriteOutput(validCreate)).toBe(true)
    expect(isFileWriteOutput(validUpdate)).toBe(true)

    const invalidOutput = {
      type: 'invalid',
      filePath: '/path/to/file.txt',
    }

    expect(isFileWriteOutput(invalidOutput)).toBe(false)
  })

  it('should validate ToolResult union type', () => {
    const fileEdit = {
      filePath: '/path/to/file.txt',
      oldString: 'old',
      newString: 'new',
      originalFile: 'old',
      structuredPatch: [],
      userModified: false,
      replaceAll: false,
    }

    const fileWrite = {
      type: 'create' as const,
      filePath: '/path/to/file.txt',
      content: 'content',
      structuredPatch: [],
      originalFile: null,
    }

    expect(isToolResult(fileEdit)).toBe(true)
    expect(isToolResult(fileWrite)).toBe(true)
    expect(isToolResult({ invalid: true })).toBe(false)
  })

  it('should assert types with throw', () => {
    const validData = { filePath: '/test.txt', oldString: 'a', newString: 'b', originalFile: 'a', structuredPatch: [], userModified: false, replaceAll: false }

    expect(() => {
      assertType(validData, isFileEditOutput, 'FileEditOutput')
    }).not.toThrow()

    const invalidData = { filePath: '/test.txt' }

    expect(() => {
      assertType(invalidData, isFileEditOutput, 'FileEditOutput')
    }).toThrow(TypeError)
  })

  it('should assert types with fallback', () => {
    const fallback = { filePath: '/fallback.txt', oldString: '', newString: '', originalFile: '', structuredPatch: [], userModified: false, replaceAll: false }

    const invalidData = { filePath: '/test.txt' }
    const result = assertTypeWithFallback(invalidData, isFileEditOutput, fallback)

    expect(result.filePath).toBe('/fallback.txt')
  })

  it('should handle edge cases', () => {
    expect(isFileEditOutput(undefined)).toBe(false)
    expect(isFileEditOutput(null)).toBe(false)
    expect(isFileEditOutput([])).toBe(false)
    expect(isFileEditOutput({})).toBe(false)
    expect(isFileEditOutput(123)).toBe(false)
    expect(isFileEditOutput('string')).toBe(false)
  })
})
