/**
 * Unit tests for MCP health check utilities
 */

import { describe, expect, it, beforeEach, afterEach } from 'bun:test'
import {
  MCPHealthMonitor,
  quickHealthCheck,
  isHealthError,
  defaultHealthCheckConfig,
} from './healthCheck.js'
import { SECOND } from '../../constants/numbers.js'
import type { MCPServerConnection } from './types.js'

describe('MCPHealthMonitor', () => {
  let monitor: MCPHealthMonitor
  let mockConnection: MCPServerConnection
  let unhealthyCalls: string[]
  let reconnectCalls: string[]

  beforeEach(() => {
    monitor = new MCPHealthMonitor({
      checkIntervalMs: 100,
      failureThreshold: 2,
      timeoutMs: 50,
      autoReconnect: false,
      maxReconnectAttempts: 3,
      reconnectDelayMs: 10,
    })

    mockConnection = {
      client: {
        ping: async () => {},
      },
      tools: [],
      resources: [],
    } as unknown as MCPServerConnection

    unhealthyCalls = []
    reconnectCalls = []
  })

  afterEach(() => {
    monitor.destroy()
  })

  describe('registerServer', () => {
    it('should register server for health monitoring', () => {
      monitor.registerServer(
        'test-server',
        mockConnection,
        (health) => unhealthyCalls.push(health.serverName),
        async (name) => {
          reconnectCalls.push(name)
          return true
        }
      )

      const health = monitor.getHealth('test-server')
      expect(health).toBeDefined()
      expect(health?.serverName).toBe('test-server')
      expect(health?.isHealthy).toBe(true)
    })

    it('should start with zero failures', () => {
      monitor.registerServer(
        'test-server',
        mockConnection,
        () => {},
        async () => true
      )

      const health = monitor.getHealth('test-server')
      expect(health?.consecutiveFailures).toBe(0)
      expect(health?.reconnectAttempts).toBe(0)
    })
  })

  describe('unregisterServer', () => {
    it('should remove server from monitoring', () => {
      monitor.registerServer(
        'test-server',
        mockConnection,
        () => {},
        async () => true
      )

      expect(monitor.getHealth('test-server')).toBeDefined()

      monitor.unregisterServer('test-server')

      expect(monitor.getHealth('test-server')).toBeUndefined()
    })
  })

  describe('getAllHealth', () => {
    it('should return health for all monitored servers', () => {
      monitor.registerServer('server1', mockConnection, () => {}, async () => true)
      monitor.registerServer('server2', mockConnection, () => {}, async () => true)

      const allHealth = monitor.getAllHealth()
      expect(allHealth).toHaveLength(2)
      expect(allHealth.map(h => h.serverName).sort()).toEqual(['server1', 'server2'])
    })

    it('should return empty array when no servers registered', () => {
      const allHealth = monitor.getAllHealth()
      expect(allHealth).toEqual([])
    })
  })

  describe('markHealthy', () => {
    it('should reset health status to healthy', () => {
      monitor.registerServer(
        'test-server',
        mockConnection,
        () => {},
        async () => true
      )

      // Simulate some failures
      const health = monitor.getHealth('test-server')!
      health.consecutiveFailures = 5
      health.isHealthy = false
      health.reconnectAttempts = 3

      monitor.markHealthy('test-server')

      expect(health.isHealthy).toBe(true)
      expect(health.consecutiveFailures).toBe(0)
      expect(health.reconnectAttempts).toBe(0)
      expect(health.isReconnecting).toBe(false)
    })
  })
})

describe('quickHealthCheck', () => {
  it('should return healthy for working server', async () => {
    const connection = {
      client: {
        ping: async () => {},
      },
    } as unknown as MCPServerConnection

    const result = await quickHealthCheck(connection, 1000)

    expect(result.healthy).toBe(true)
    expect(result.responseTime).toBeGreaterThanOrEqual(0)
    expect(result.error).toBeUndefined()
  })

  it('should return unhealthy for failing server', async () => {
    const connection = {
      client: {
        ping: async () => {
          throw new Error('Connection failed')
        },
      },
    } as unknown as MCPServerConnection

    const result = await quickHealthCheck(connection, 1000)

    expect(result.healthy).toBe(false)
    expect(result.error).toBe('Connection failed')
    expect(result.responseTime).toBeGreaterThanOrEqual(0)
  })

  it('should timeout slow responses', async () => {
    const connection = {
      client: {
        ping: async () => {
          await new Promise(resolve => setTimeout(resolve, 1000))
        },
      },
    } as unknown as MCPServerConnection

    const result = await quickHealthCheck(connection, 50)

    expect(result.healthy).toBe(false)
    expect(result.error).toBe('Timeout')
  })

  it('should use getServerCapabilities if ping not available', async () => {
    let capabilitiesCalled = false
    const connection = {
      client: {
        getServerCapabilities: async () => {
          capabilitiesCalled = true
          return {}
        },
      },
    } as unknown as MCPServerConnection

    const result = await quickHealthCheck(connection, 1000)

    expect(result.healthy).toBe(true)
    expect(capabilitiesCalled).toBe(true)
  })
})

describe('isHealthError', () => {
  it('should return true for connection errors', () => {
    expect(isHealthError(new Error('Connection closed'))).toBe(true)
    expect(isHealthError(new Error('Connection refused'))).toBe(true)
    expect(isHealthError(new Error('Connection reset'))).toBe(true)
  })

  it('should return true for timeout errors', () => {
    expect(isHealthError(new Error('Request timeout'))).toBe(true)
    expect(isHealthError(new Error('Operation timeout'))).toBe(true)
  })

  it('should return true for network errors', () => {
    expect(isHealthError(new Error('ECONNREFUSED'))).toBe(true)
    expect(isHealthError(new Error('ECONNRESET'))).toBe(true)
    expect(isHealthError(new Error('ENETUNREACH'))).toBe(true)
  })

  it('should return true for health check failures', () => {
    expect(isHealthError(new Error('Health check failed'))).toBe(true)
  })

  it('should return false for non-health errors', () => {
    expect(isHealthError(new Error('Invalid argument'))).toBe(false)
    expect(isHealthError(new Error('Not found'))).toBe(false)
  })

  it('should return false for non-errors', () => {
    expect(isHealthError('string')).toBe(false)
    expect(isHealthError(null)).toBe(false)
    expect(isHealthError(undefined)).toBe(false)
  })
})

describe('defaultHealthCheckConfig', () => {
  it('should have correct default values', () => {
    expect(defaultHealthCheckConfig.checkIntervalMs).toBe(30 * SECOND)
    expect(defaultHealthCheckConfig.failureThreshold).toBe(3)
    expect(defaultHealthCheckConfig.timeoutMs).toBe(10 * SECOND)
    expect(defaultHealthCheckConfig.autoReconnect).toBe(true)
    expect(defaultHealthCheckConfig.maxReconnectAttempts).toBe(5)
    expect(defaultHealthCheckConfig.reconnectDelayMs).toBe(5 * SECOND)
  })
})
