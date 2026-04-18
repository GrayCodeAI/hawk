/**
 * E2E Tests for Constants
 * Tests numeric constants and conversions
 */

import { describe, expect, it } from 'bun:test'
import {
  BYTES_PER_KB,
  BYTES_PER_MB,
  BYTES_PER_GB,
  KB,
  MB,
  GB,
  MS_PER_SECOND,
  MS_PER_MINUTE,
  MS_PER_HOUR,
  SECOND,
  MINUTE,
  HOUR,
} from '../../src/constants/numbers.js'

describe('Constants E2E', () => {
  it('should have correct byte conversions', () => {
    expect(BYTES_PER_KB).toBe(1024)
    expect(BYTES_PER_MB).toBe(1024 * 1024)
    expect(BYTES_PER_GB).toBe(1024 * 1024 * 1024)

    expect(KB).toBe(1024)
    expect(MB).toBe(1024 * 1024)
    expect(GB).toBe(1024 * 1024 * 1024)
  })

  it('should have correct time conversions', () => {
    expect(MS_PER_SECOND).toBe(1000)
    expect(MS_PER_MINUTE).toBe(60 * 1000)
    expect(MS_PER_HOUR).toBe(60 * 60 * 1000)

    expect(SECOND).toBe(1000)
    expect(MINUTE).toBe(60 * 1000)
    expect(HOUR).toBe(60 * 60 * 1000)
  })

  it('should calculate file sizes correctly', () => {
    const fileSize = 5 * MB
    expect(fileSize).toBe(5 * 1024 * 1024)

    const largeFile = 2 * GB
    expect(largeFile).toBe(2 * 1024 * 1024 * 1024)
  })

  it('should calculate timeouts correctly', () => {
    const timeout = 30 * SECOND
    expect(timeout).toBe(30000)

    const longTimeout = 5 * MINUTE
    expect(longTimeout).toBe(300000)
  })
})
