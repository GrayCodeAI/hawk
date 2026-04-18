/**
 * E2E Tests for WebSocket Connections
 */

import { describe, expect, it } from 'bun:test'
import { WebSocket } from 'ws'

describe('WebSocket E2E', () => {
  it('should establish WebSocket connection', async () => {
    const connected = await new Promise<boolean>(resolve => {
      const ws = new WebSocket('wss://echo.websocket.org/')
      ws.on('open', () => {
        resolve(true)
        ws.close()
      })
      ws.on('error', () => resolve(false))
      setTimeout(() => resolve(false), 5000)
    })
    expect(connected).toBe(true)
  })

  it('should handle connection errors gracefully', async () => {
    const result = await new Promise<{ success: boolean; error?: string }>(resolve => {
      const ws = new WebSocket('wss://invalid-server.example.com')
      ws.on('error', err => {
        resolve({ success: false, error: err.message })
      })
      setTimeout(() => resolve({ success: false }), 2000)
    })
    expect(result.success).toBe(false)
  })
})
