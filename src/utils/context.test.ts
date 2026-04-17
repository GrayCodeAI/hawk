import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
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
})
