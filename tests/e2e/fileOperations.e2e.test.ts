/**
 * E2E Tests for File Operations
 */

import { describe, expect, it } from 'bun:test'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('File Operations E2E', () => {
  it('should create, read, and delete files', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'hawk-test-'))
    const testFile = join(tmpDir, 'test.txt')

    // Create
    writeFileSync(testFile, 'hello world')

    // Read
    const content = readFileSync(testFile, 'utf-8')
    expect(content).toBe('hello world')

    // Cleanup
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('should handle large files efficiently', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'hawk-test-'))
    const testFile = join(tmpDir, 'large.bin')

    const largeContent = 'x'.repeat(1024 * 1024) // 1MB
    writeFileSync(testFile, largeContent)

    const stats = readFileSync(testFile)
    expect(stats.length).toBe(1024 * 1024)

    rmSync(tmpDir, { recursive: true, force: true })
  })
})
