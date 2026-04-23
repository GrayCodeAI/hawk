import { describe, expect, test } from 'bun:test'
import {
  anthropicNameToCanonical,
  getCanonicalName,
  getMarketingNameForModel,
  getPublicModelDisplayName,
} from './model.js'

describe('anthropicNameToCanonical', () => {
  test('strips date suffix from known models', () => {
    expect(anthropicNameToCanonical('claude-opus-4-6')).toBe('claude-opus-4-6')
    expect(anthropicNameToCanonical('claude-opus-4-5-20251101')).toBe('claude-opus-4-5')
    expect(anthropicNameToCanonical('claude-sonnet-4-6')).toBe('claude-sonnet-4-6')
    expect(anthropicNameToCanonical('claude-sonnet-4-5-20250929')).toBe('claude-sonnet-4-5')
    expect(anthropicNameToCanonical('claude-haiku-4-5-20251001')).toBe('claude-haiku-4-5')
  })

  test('handles legacy 3.x models', () => {
    expect(anthropicNameToCanonical('claude-3-7-sonnet-20250219')).toBe('claude-3-7-sonnet')
    expect(anthropicNameToCanonical('claude-3-5-sonnet-20241022')).toBe('claude-3-5-sonnet')
    expect(anthropicNameToCanonical('claude-3-5-haiku-20241022')).toBe('claude-3-5-haiku')
  })

  test('handles Bedrock-style ARNs', () => {
    expect(anthropicNameToCanonical('us.graycode.claude-opus-4-6-v1:0')).toBe('claude-opus-4-6')
    expect(anthropicNameToCanonical('us.anthropic.claude-sonnet-4-5-20250929-v1:0')).toBe('claude-sonnet-4-5')
  })

  test('returns original name for unknown patterns', () => {
    expect(anthropicNameToCanonical('gpt-4o')).toBe('gpt-4o')
    expect(anthropicNameToCanonical('gemini-2.0-flash')).toBe('gemini-2.0-flash')
    expect(anthropicNameToCanonical('llama3.1:70b')).toBe('llama3.1:70b')
  })

  test('is case-insensitive', () => {
    expect(anthropicNameToCanonical('Claude-Opus-4-6')).toBe('claude-opus-4-6')
    expect(anthropicNameToCanonical('CLAUDE-SONNET-4-5-20250929')).toBe('claude-sonnet-4-5')
  })
})

describe('getCanonicalName', () => {
  test('returns short canonical for known models', () => {
    expect(getCanonicalName('claude-opus-4-6')).toBe('claude-opus-4-6')
    expect(getCanonicalName('claude-opus-4-5-20251101')).toBe('claude-opus-4-5')
    expect(getCanonicalName('claude-sonnet-4-6')).toBe('claude-sonnet-4-6')
  })
})

describe('getPublicModelDisplayName', () => {
  test('returns display name for known Hawk model keys', () => {
    expect(getPublicModelDisplayName('claude-opus-4-6')).toBe('Opus 4.6')
    expect(getPublicModelDisplayName('claude-sonnet-4-6')).toBe('Sonnet 4.6')
    expect(getPublicModelDisplayName('claude-haiku-4-5-20251001')).toBe('Haiku 4.5')
  })

  test('handles [1m] suffix', () => {
    expect(getPublicModelDisplayName('claude-opus-4-6[1m]')).toBe('Opus 4.6 (1M context)')
    expect(getPublicModelDisplayName('claude-sonnet-4-6[1m]')).toBe('Sonnet 4.6 (1M context)')
  })

  test('returns null for non-anthropic models', () => {
    expect(getPublicModelDisplayName('gpt-4o')).toBeNull()
    expect(getPublicModelDisplayName('gemini-2.0-flash')).toBeNull()
    expect(getPublicModelDisplayName('llama3.1:70b')).toBeNull()
  })
})

describe('getMarketingNameForModel', () => {
  test('returns marketing name for known models', () => {
    expect(getMarketingNameForModel('claude-opus-4-6')).toBe('Opus 4.6')
    expect(getMarketingNameForModel('claude-sonnet-4-6')).toBe('Sonnet 4.6')
    expect(getMarketingNameForModel('claude-haiku-4-5-20251001')).toBe('Haiku 4.5')
    expect(getMarketingNameForModel('claude-3-7-sonnet-20250219')).toBe('Sonnet 3.7')
  })

  test('handles [1m] suffix', () => {
    expect(getMarketingNameForModel('claude-opus-4-6[1m]')).toBe('Opus 4.6 (with 1M context)')
    expect(getMarketingNameForModel('claude-sonnet-4-6[1m]')).toBe('Sonnet 4.6 (with 1M context)')
  })

  test('returns undefined for unknown models', () => {
    expect(getMarketingNameForModel('gpt-4o')).toBeUndefined()
    expect(getMarketingNameForModel('unknown-model')).toBeUndefined()
  })
})
