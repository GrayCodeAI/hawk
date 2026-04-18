/**
 * E2E Tests for MCP Health Monitoring
 * Tests real-world health check scenarios
 */

import { describe, expect, it } from 'bun:test'
import { MCPHealthMonitor, quickHealthCheck } from '../../src/services/mcp/healthCheck.js'
import { SECOND } from '../../src/constants/numbers.js'
import type { MCPServerConnection } from '../../src/services/mcp/types.js'

describe('MCP Health E2E', () => {
  it('should detect unhealthy server after failures', async () => {
    const monitor = new MCPHealthMonitor({
      checkIntervalMs: 100,
      failureThreshold: 3,
      timeoutMs: 50,
      autoReconnect: false,
    })

    let unhealthyCalled = false
    let reconnectAttempts = 0

    // Mock connection that fails
    const mockConnection = {
      client: {
        ping: async () => {
          throw new Error('Connection failed')
        },
      },
      tools: [],
    } as unknown as MCPServerConnection

    monitor.registerServer(
      'test-server',
      mockConnection,
      () => { unhealthyCalled = true },
      async () => {
        reconnectAttempts++
        return false
      }
    )

    // Wait for 3 health checks to fail
    await new Promise(resolve => setTimeout(resolve, 400))

    expect(unhealthyCalled).toBe(true)

    const health = monitor.getHealth('test-server')
    expect(health?.isHealthy).toBe(false)
    expect(health?.consecutiveFailures).toBeGreaterThanOrEqual(3)

    monitor.destroy()
  })

  it('should auto-reconnect on failure', async () => {
    const monitor = new MCPHealthMonitor({
      checkIntervalMs: 100,
      failureThreshold: 2,
      timeoutMs: 50,
      autoReconnect: true,
      maxReconnectAttempts: 3,
      reconnectDelayMs: 50,
    })

    let reconnectCount = 0

    const mockConnection = {
      client: {
        ping: async () => {
          throw new Error('Connection failed')
        },
      },
    } as unknown as MCPServerConnection

    monitor.registerServer(
      'auto-reconnect-server',
      mockConnection,
      () => {},
      async () => {
        reconnectCount++
        return false // Reconnect fails
      }
    )

    // Wait for reconnection attempts
    await new Promise(resolve => setTimeout(resolve, 600))

    expect(reconnectCount).toBeGreaterThanOrEqual(1)
    expect(reconnectCount).toBeLessThanOrEqual(3)

    monitor.destroy()
  })

  it('should perform quick health check', async () => {
    // Healthy server
    const healthyConnection = {
      client: {
        ping: async () => {},
      },
    } as unknown as MCPServerConnection

    const healthyResult = await quickHealthCheck(healthyConnection, 1000)
    expect(healthyResult.healthy).toBe(true)
    expect(healthyResult.responseTime).toBeGreaterThanOrEqual(0)

    // Unhealthy server
    const unhealthyConnection = {
      client: {
        ping: async () => {
          throw new Error('Connection refused')
        },
      },
    } as unknown as MCPServerConnection

    const unhealthyResult = await quickHealthCheck(unhealthyConnection, 1000)
    expect(unhealthyResult.healthy).toBe(false)
    expect(unhealthyResult.error).toBe('Connection refused')
  })

  it('should handle timeout correctly', async () => {
    const slowConnection = {
      client: {
        ping: async () => {
          await new Promise(resolve => setTimeout(resolve, 2000))
        },
      },
    } as unknown as MCPServerConnection

    const result = await quickHealthCheck(slowConnection, 50)
    expect(result.healthy).toBe(false)
    expect(result.error).toBe('Timeout')
  })

  it('should track multiple servers independently', async () => {
    const monitor = new MCPHealthMonitor({
      checkIntervalMs: 100,
      failureThreshold: 2,
      timeoutMs: 50,
      autoReconnect: false,
    })

    let server1Unhealthy = false
    let server2Unhealthy = false

    const healthyConnection = {
      client: { ping: async () => {} },
    } as unknown as MCPServerConnection

    const unhealthyConnection = {
      client: {
        ping: async () => {
          throw new Error('Failed')
        },
      },
    } as unknown as MCPServerConnection

    monitor.registerServer(
      'server-1',
      healthyConnection,
      () => { server1Unhealthy = true },
      async () => true
    )

    monitor.registerServer(
      'server-2',
      unhealthyConnection,
      () => { server2Unhealthy = true },
      async () => true
    )

    // Wait for health checks
    await new Promise(resolve => setTimeout(resolve, 300))

    // Server 1 should be healthy, server 2 unhealthy
    expect(server1Unhealthy).toBe(false)
    expect(server2Unhealthy).toBe(true)

    monitor.destroy()
  })
})
