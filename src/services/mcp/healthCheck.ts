/**
 * MCP Server Health Check Utilities
 * Monitors MCP server health and provides automatic recovery
 */

import { logError, logForDebugging } from '../../utils/log.js'
import { SECOND, MINUTE } from '../../constants/numbers.js'
import type { MCPServerConnection } from './types.js'

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  /** Health check interval in milliseconds */
  checkIntervalMs: number
  /** Number of consecutive failures before marking unhealthy */
  failureThreshold: number
  /** Timeout for health check operations */
  timeoutMs: number
  /** Whether to automatically reconnect on failure */
  autoReconnect: boolean
  /** Maximum number of reconnection attempts */
  maxReconnectAttempts: number
  /** Delay between reconnection attempts */
  reconnectDelayMs: number
}

/**
 * Default health check configuration
 */
export const defaultHealthCheckConfig: HealthCheckConfig = {
  checkIntervalMs: 30 * SECOND,
  failureThreshold: 3,
  timeoutMs: 10 * SECOND,
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelayMs: 5 * SECOND,
}

/**
 * Health status of an MCP server
 */
export interface ServerHealth {
  /** Server name/identifier */
  serverName: string
  /** Whether the server is healthy */
  isHealthy: boolean
  /** Number of consecutive failures */
  consecutiveFailures: number
  /** Timestamp of last successful check */
  lastSuccessfulCheck?: number
  /** Timestamp of last failed check */
  lastFailedCheck?: number
  /** Error message from last failure */
  lastError?: string
  /** Number of reconnection attempts */
  reconnectAttempts: number
  /** Whether the server is currently reconnecting */
  isReconnecting: boolean
}

/**
 * MCP Server Health Monitor
 * Tracks health status and manages reconnection logic
 */
export class MCPHealthMonitor {
  private healthStatus = new Map<string, ServerHealth>()
  private checkTimers = new Map<string, Timer>()
  private config: HealthCheckConfig

  constructor(config: Partial<HealthCheckConfig> = {}) {
    this.config = { ...defaultHealthCheckConfig, ...config }
  }

  /**
   * Register an MCP server for health monitoring
   * @param serverName - Unique server identifier
   * @param connection - MCP server connection
   * @param onUnhealthy - Callback when server becomes unhealthy
   * @param onReconnect - Callback to attempt reconnection
   */
  registerServer(
    serverName: string,
    connection: MCPServerConnection,
    onUnhealthy: (health: ServerHealth) => void,
    onReconnect: (serverName: string) => Promise<boolean>
  ): void {
    // Initialize health status
    this.healthStatus.set(serverName, {
      serverName,
      isHealthy: true,
      consecutiveFailures: 0,
      reconnectAttempts: 0,
      isReconnecting: false,
    })

    // Start periodic health checks
    this.startHealthChecks(serverName, connection, onUnhealthy, onReconnect)

    logForDebugging(`Started health monitoring for MCP server: ${serverName}`, {
      level: 'debug',
    })
  }

  /**
   * Unregister a server from health monitoring
   */
  unregisterServer(serverName: string): void {
    // Clear check timer
    const timer = this.checkTimers.get(serverName)
    if (timer) {
      clearInterval(timer)
      this.checkTimers.delete(serverName)
    }

    // Remove health status
    this.healthStatus.delete(serverName)

    logForDebugging(
      `Stopped health monitoring for MCP server: ${serverName}`,
      { level: 'debug' }
    )
  }

  /**
   * Get current health status for a server
   */
  getHealth(serverName: string): ServerHealth | undefined {
    return this.healthStatus.get(serverName)
  }

  /**
   * Get health status for all monitored servers
   */
  getAllHealth(): ServerHealth[] {
    return Array.from(this.healthStatus.values())
  }

  /**
   * Mark a server as healthy (e.g., after successful reconnection)
   */
  markHealthy(serverName: string): void {
    const health = this.healthStatus.get(serverName)
    if (health) {
      health.isHealthy = true
      health.consecutiveFailures = 0
      health.reconnectAttempts = 0
      health.isReconnecting = false
      health.lastSuccessfulCheck = Date.now()
      delete health.lastError
    }
  }

  /**
   * Start periodic health checks for a server
   */
  private startHealthChecks(
    serverName: string,
    connection: MCPServerConnection,
    onUnhealthy: (health: ServerHealth) => void,
    onReconnect: (serverName: string) => Promise<boolean>
  ): void {
    const timer = setInterval(async () => {
      await this.performHealthCheck(
        serverName,
        connection,
        onUnhealthy,
        onReconnect
      )
    }, this.config.checkIntervalMs)

    this.checkTimers.set(serverName, timer)
  }

  /**
   * Perform a single health check
   */
  private async performHealthCheck(
    serverName: string,
    connection: MCPServerConnection,
    onUnhealthy: (health: ServerHealth) => void,
    onReconnect: (serverName: string) => Promise<boolean>
  ): Promise<void> {
    const health = this.healthStatus.get(serverName)
    if (!health || health.isReconnecting) {
      return
    }

    try {
      // Perform health check with timeout
      const isHealthy = await this.checkServerHealth(connection)

      if (isHealthy) {
        // Reset failure count on success
        if (health.consecutiveFailures > 0) {
          logForDebugging(
            `MCP server ${serverName} recovered`,
            { level: 'info' }
          )
          this.markHealthy(serverName)
        }
      } else {
        // Increment failure count
        health.consecutiveFailures++
        health.lastFailedCheck = Date.now()

        logForDebugging(
          `MCP server ${serverName} health check failed (${health.consecutiveFailures}/${this.config.failureThreshold})`,
          { level: 'warn' }
        )

        // Check if threshold reached
        if (health.consecutiveFailures >= this.config.failureThreshold) {
          health.isHealthy = false
          onUnhealthy(health)

          // Attempt reconnection if enabled
          if (this.config.autoReconnect && !health.isReconnecting) {
            await this.attemptReconnection(serverName, onReconnect)
          }
        }
      }
    } catch (error) {
      // Handle check error
      health.consecutiveFailures++
      health.lastFailedCheck = Date.now()
      health.lastError = error instanceof Error ? error.message : String(error)

      logError(error)

      if (health.consecutiveFailures >= this.config.failureThreshold) {
        health.isHealthy = false
        onUnhealthy(health)

        if (this.config.autoReconnect && !health.isReconnecting) {
          await this.attemptReconnection(serverName, onReconnect)
        }
      }
    }
  }

  /**
   * Check if a server is healthy
   * Attempts to ping the server or check capabilities
   */
  private async checkServerHealth(
    connection: MCPServerConnection
  ): Promise<boolean> {
    // Create a timeout promise
    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(
        () => reject(new Error('Health check timeout')),
        this.config.timeoutMs
      )
    })

    // Create the health check promise
    const checkPromise = this.executeHealthCheck(connection)

    // Race between check and timeout
    try {
      return await Promise.race([checkPromise, timeoutPromise])
    } catch {
      return false
    }
  }

  /**
   * Execute the actual health check logic
   */
  private async executeHealthCheck(
    connection: MCPServerConnection
  ): Promise<boolean> {
    try {
      // Try to get server capabilities (lightweight operation)
      if (connection.client) {
        // Check if client has getServerCapabilities method
        const client = connection.client as {
          getServerCapabilities?: () => Promise<unknown>
          ping?: () => Promise<unknown>
        }

        if (client.ping) {
          await client.ping()
          return true
        }

        if (client.getServerCapabilities) {
          await client.getServerCapabilities()
          return true
        }

        // Fallback: check if we can access any property without error
        return connection.tools !== undefined
      }

      return false
    } catch {
      return false
    }
  }

  /**
   * Attempt to reconnect to a server
   */
  private async attemptReconnection(
    serverName: string,
    onReconnect: (serverName: string) => Promise<boolean>
  ): Promise<void> {
    const health = this.healthStatus.get(serverName)
    if (!health) return

    health.isReconnecting = true

    while (health.reconnectAttempts < this.config.maxReconnectAttempts) {
      health.reconnectAttempts++

      logForDebugging(
        `Attempting to reconnect to MCP server ${serverName} (attempt ${health.reconnectAttempts}/${this.config.maxReconnectAttempts})`,
        { level: 'info' }
      )

      try {
        const success = await onReconnect(serverName)

        if (success) {
          logForDebugging(
            `Successfully reconnected to MCP server ${serverName}`,
            { level: 'info' }
          )
          this.markHealthy(serverName)
          return
        }
      } catch (error) {
        logError(error)
      }

      // Wait before next attempt
      if (health.reconnectAttempts < this.config.maxReconnectAttempts) {
        await this.delay(this.config.reconnectDelayMs)
      }
    }

    // Max attempts reached
    health.isReconnecting = false
    logForDebugging(
      `Failed to reconnect to MCP server ${serverName} after ${this.config.maxReconnectAttempts} attempts`,
      { level: 'error' }
    )
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Destroy the health monitor
   * Stops all health checks
   */
  destroy(): void {
    // Stop all timers
    for (const timer of this.checkTimers.values()) {
      clearInterval(timer)
    }
    this.checkTimers.clear()
    this.healthStatus.clear()
  }
}

/**
 * Global health monitor instance
 */
export const globalMCPHealthMonitor = new MCPHealthMonitor()

/**
 * Quick health check for a single server
 * One-off check without continuous monitoring
 */
export async function quickHealthCheck(
  connection: MCPServerConnection,
  timeoutMs: number = 10 * SECOND
): Promise<{
  healthy: boolean
  error?: string
  responseTime: number
}> {
  const startTime = Date.now()

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    })

    const checkPromise = (async () => {
      const client = connection.client as {
        ping?: () => Promise<unknown>
        getServerCapabilities?: () => Promise<unknown>
      }

      if (client.ping) {
        await client.ping()
      } else if (client.getServerCapabilities) {
        await client.getServerCapabilities()
      }
    })()

    await Promise.race([checkPromise, timeoutPromise])

    return {
      healthy: true,
      responseTime: Date.now() - startTime,
    }
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : String(error),
      responseTime: Date.now() - startTime,
    }
  }
}

/**
 * Check if an MCP error is a connection/health error
 */
export function isHealthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const healthErrorPatterns = [
    /connection.*closed/i,
    /connection.*refused/i,
    /connection.*reset/i,
    /timeout/i,
    /econnrefused/i,
    /econnreset/i,
    /enetunreach/i,
    /health.*check.*failed/i,
  ]

  return healthErrorPatterns.some(pattern => pattern.test(error.message))
}
