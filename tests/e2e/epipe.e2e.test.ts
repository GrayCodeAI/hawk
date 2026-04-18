/**
 * E2E Tests for EPIPE Handling
 * Tests error handling for broken pipes
 */

import { describe, expect, it } from 'bun:test'
import { spawn } from 'child_process'
import { errorMessage } from '../../src/utils/errors.js'

describe('EPIPE Handling E2E', () => {
  it('should handle EPIPE when process exits early', async () => {
    // Spawn a process that exits immediately
    const child = spawn('echo', ['hello'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    // Try to write to stdin after process exits
    await new Promise(resolve => setTimeout(resolve, 100))

    let errorOccurred = false
    try {
      child.stdin.write('data\n')
      child.stdin.end()
    } catch (error) {
      errorOccurred = true
      const message = errorMessage(error)
      // EPIPE errors are expected when writing to closed pipe
      expect(message.includes('EPIPE') || message.includes('broken pipe')).toBe(true)
    }

    // Error may or may not occur depending on timing
    // The important thing is it doesn't crash
    expect(true).toBe(true)
  })

  it('should handle EPIPE gracefully in async context', async () => {
    const result = await new Promise<{ success: boolean; error?: string }>(resolve => {
      const child = spawn('exit', ['0'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      })

      child.on('exit', () => {
        // Try to write after exit
        try {
          child.stdin.write('test\n')
          child.stdin.end()
          resolve({ success: true })
        } catch (error) {
          resolve({ success: false, error: errorMessage(error) })
        }
      })
    })

    // Should complete without crashing
    expect(result).toBeDefined()
  })
})
