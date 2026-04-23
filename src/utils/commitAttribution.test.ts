import { describe, expect, test } from 'bun:test'
import { sanitizeModelName, sanitizeSurfaceKey } from './commitAttribution.js'

describe('sanitizeModelName', () => {
  test('passes through model name unchanged (model-agnostic)', () => {
    expect(sanitizeModelName('gpt-4o')).toBe('gpt-4o')
    expect(sanitizeModelName('claude-sonnet-4-6')).toBe('claude-sonnet-4-6')
    expect(sanitizeModelName('gemini-2.0-flash')).toBe('gemini-2.0-flash')
    expect(sanitizeModelName('llama3.1:70b')).toBe('llama3.1:70b')
    expect(sanitizeModelName('unknown-model')).toBe('unknown-model')
  })
})

describe('sanitizeSurfaceKey', () => {
  test('passes through surface key unchanged (model-agnostic)', () => {
    expect(sanitizeSurfaceKey('cli/gpt-4o')).toBe('cli/gpt-4o')
    expect(sanitizeSurfaceKey('cli/claude-sonnet-4-6')).toBe('cli/claude-sonnet-4-6')
    expect(sanitizeSurfaceKey('vscode/gemini-2.0-flash')).toBe('vscode/gemini-2.0-flash')
    expect(sanitizeSurfaceKey('simple-key')).toBe('simple-key')
  })
})
