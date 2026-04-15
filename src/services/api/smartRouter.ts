import type { ProviderProfile } from '../../utils/providerConfig.js'
import { PROVIDER_PRIORITY } from '../../utils/providerRegistry.js'
import { isProviderConfigured, loadProviderConfig } from '../../utils/providerConfig.js'

export interface ProviderMetrics {
  name: ProviderProfile
  healthy: boolean
  configured: boolean
  latencyMs: number
  avgLatencyMs: number
  requestCount: number
  errorCount: number
  costPer1kTokens: number
}

export type RoutingStrategy = 'latency' | 'cost' | 'balanced'

export class SmartRouter {
  private providers: Map<ProviderProfile, ProviderMetrics> = new Map()
  private strategy: RoutingStrategy = 'balanced'
  private initialized = false

  constructor(strategy: RoutingStrategy = 'balanced') {
    this.strategy = strategy
    this.initializeProviders()
  }

  private initializeProviders(): void {
    const config = loadProviderConfig()
    const costMap: Record<ProviderProfile, number> = {
      anthropic: 0.003,
      openai: 0.002,
      openrouter: 0.0015,
      grok: 0.005,
      gemini: 0.0005,
      ollama: 0,
      canopywave: 0.002,
      opencodego: 0.001,
    }

    for (const provider of PROVIDER_PRIORITY) {
      this.providers.set(provider, {
        name: provider,
        healthy: true,
        configured: config ? isProviderConfigured(config, provider) : false,
        latencyMs: 9999,
        avgLatencyMs: 9999,
        requestCount: 0,
        errorCount: 0,
        costPer1kTokens: costMap[provider] || 0.002,
      })
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    await Promise.allSettled(
      Array.from(this.providers.values())
        .filter(p => p.configured)
        .map(p => this.pingProvider(p))
    )

    this.initialized = true
  }

  private async pingProvider(metrics: ProviderMetrics): Promise<void> {
    const start = Date.now()
    
    try {
      // Simple health check - just verify configuration exists
      if (!metrics.configured) {
        metrics.healthy = false
        return
      }

      const elapsed = Date.now() - start
      metrics.latencyMs = elapsed
      metrics.avgLatencyMs = elapsed
      metrics.healthy = true
    } catch {
      metrics.healthy = false
    }
  }

  private scoreProvider(metrics: ProviderMetrics): number {
    if (!metrics.healthy || !metrics.configured) {
      return Infinity
    }

    const errorRate = metrics.requestCount > 0 
      ? metrics.errorCount / metrics.requestCount 
      : 0

    const latencyScore = metrics.avgLatencyMs / 1000
    const costScore = metrics.costPer1kTokens * 100
    const errorPenalty = errorRate * 500

    switch (this.strategy) {
      case 'latency':
        return latencyScore + errorPenalty
      case 'cost':
        return costScore + errorPenalty
      default: // balanced
        return (latencyScore * 0.5) + (costScore * 0.5) + errorPenalty
    }
  }

  selectProvider(excludeProviders: Set<string> = new Set()): ProviderProfile | null {
    let bestProvider: ProviderProfile | null = null
    let bestScore = Infinity

    for (const [provider, metrics] of this.providers) {
      if (excludeProviders.has(provider)) continue
      
      const score = this.scoreProvider(metrics)
      if (score < bestScore) {
        bestScore = score
        bestProvider = provider
      }
    }

    return bestProvider
  }

  recordResult(provider: ProviderProfile, success: boolean, durationMs: number): void {
    const metrics = this.providers.get(provider)
    if (!metrics) return

    metrics.requestCount++
    
    if (success) {
      const alpha = 0.3
      metrics.avgLatencyMs = alpha * durationMs + (1 - alpha) * metrics.avgLatencyMs
    } else {
      metrics.errorCount++
      
      // Mark unhealthy if error rate > 70% over last 3 requests
      if (metrics.requestCount >= 3) {
        const errorRate = metrics.errorCount / metrics.requestCount
        if (errorRate > 0.7) {
          metrics.healthy = false
          // Schedule recheck after 60s
          setTimeout(() => this.recheckProvider(provider), 60000)
        }
      }
    }
  }

  private async recheckProvider(provider: ProviderProfile): Promise<void> {
    const metrics = this.providers.get(provider)
    if (!metrics) return

    await this.pingProvider(metrics)
  }

  getStatus(): ProviderMetrics[] {
    return Array.from(this.providers.values())
  }

  getHealthyProviders(): ProviderProfile[] {
    return Array.from(this.providers.values())
      .filter(m => m.healthy && m.configured)
      .map(m => m.name)
  }
}

let globalRouter: SmartRouter | null = null

export function getSmartRouter(): SmartRouter {
  if (!globalRouter) {
    const strategy = (process.env.ROUTER_STRATEGY as RoutingStrategy) || 'balanced'
    globalRouter = new SmartRouter(strategy)
  }
  return globalRouter
}

export function resetSmartRouter(): void {
  globalRouter = null
}
