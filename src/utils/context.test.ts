import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  calculateContextPercentages,
  getContextWindowForModel,
  getModelMaxOutputTokens,
  MODEL_CONTEXT_WINDOW_DEFAULT,
} from './context.ts'

const ORIGINAL_ENV = { ...process.env }

function writeProviderConfig(tempDir: string): void {
  writeFileSync(
    join(tempDir, 'provider.json'),
    JSON.stringify({
      active_provider: 'opencodego',
      opencodego_api_key: 'test-key',
    }),
  )
}

describe('context provider catalog fallback', () => {
  let tempDir: string

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    tempDir = mkdtempSync(join(tmpdir(), 'hawk-context-'))
    process.env.HAWK_CONFIG_DIR = tempDir
    writeProviderConfig(tempDir)
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    rmSync(tempDir, { recursive: true, force: true })
  })

  test('uses the provider catalog context window for opencodego models', () => {
    expect(getContextWindowForModel('qwen3.6-plus')).toBe(1_000_000)
  })

  test('caps provider catalog 1M models when 1M context is disabled', () => {
    process.env.HAWK_CODE_DISABLE_1M_CONTEXT = 'true'
    expect(getContextWindowForModel('qwen3.6-plus')).toBe(MODEL_CONTEXT_WINDOW_DEFAULT)
  })

  test('uses the provider catalog max output tokens for opencodego models', () => {
    expect(getModelMaxOutputTokens('qwen3.6-plus')).toEqual({
      default: 65_536,
      upperLimit: 65_536,
    })
  })

  test('calculateContextPercentages does not double-count cache tokens', () => {
    // input_tokens already includes cache tokens for providers that report them
    const result = calculateContextPercentages(
      {
        input_tokens: 1200, // includes 200 cache read
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 200,
      },
      200_000,
    )
    // Should be 1200/200000 = 0.6%, not 1400/200000 = 0.7%
    expect(result.used).toBe(1)
  })
})
