/**
 * E2E Tests for Validation Utilities
 */

import { describe, expect, it } from 'bun:test'
import { isOptionalString, isOptionalNumber, isOptionalBoolean, isEventMetadata } from '../../src/utils/typeGuards.js'

describe('Validation E2E', () => {
  it('should validate optional strings', () => {
    expect(isOptionalString(undefined)).toBe(true)
    expect(isOptionalString('test')).toBe(true)
    expect(isOptionalString('')).toBe(true)
    expect(isOptionalString(123)).toBe(false)
    expect(isOptionalString(null)).toBe(false)
    expect(isOptionalString({})).toBe(false)
  })

  it('should validate optional numbers', () => {
    expect(isOptionalNumber(undefined)).toBe(true)
    expect(isOptionalNumber(123)).toBe(true)
    expect(isOptionalNumber(0)).toBe(true)
    expect(isOptionalNumber(-5)).toBe(true)
    expect(isOptionalNumber('123')).toBe(false)
    expect(isOptionalNumber(null)).toBe(false)
  })

  it('should validate optional booleans', () => {
    expect(isOptionalBoolean(undefined)).toBe(true)
    expect(isOptionalBoolean(true)).toBe(true)
    expect(isOptionalBoolean(false)).toBe(true)
    expect(isOptionalBoolean('true')).toBe(false)
    expect(isOptionalBoolean(1)).toBe(false)
    expect(isOptionalBoolean(null)).toBe(false)
  })

  it('should validate event metadata', () => {
    expect(isEventMetadata({})).toBe(true)
    expect(isEventMetadata({ event_id: '123' })).toBe(true)
    expect(isEventMetadata({ device_id: 'abc' })).toBe(true)
    expect(isEventMetadata({ event_id: '123', device_id: 'abc' })).toBe(true)
    expect(isEventMetadata({ event_id: 123 })).toBe(false)
    expect(isEventMetadata({ device_id: null })).toBe(false)
    expect(isEventMetadata(null)).toBe(false)
    expect(isEventMetadata('string')).toBe(false)
  })
})
