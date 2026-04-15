import { describe, it, expect, beforeEach } from 'bun:test'
import { SmartRouter, resetSmartRouter } from '../src/services/api/smartRouter.js'
import type { ProviderProfile } from '../src/utils/providerConfig.js'

describe('SmartRouter', () => {
  beforeEach(() => {
    resetSmartRouter()
  })

  it('selects fastest provider for latency strategy', () => {
    const router = new SmartRouter('latency')
    
    // Simulate metrics
    const status = router.getStatus()
    const openai = status.find(p => p.name === 'openai')
    const gemini = status.find(p => p.name === 'gemini')
    
    if (openai && gemini) {
      openai.configured = true
      openai.healthy = true
      openai.avgLatencyMs = 500
      
      gemini.configured = true
      gemini.healthy = true
      gemini.avgLatencyMs = 200
      
      const selected = router.selectProvider()
      expect(selected).toBe('gemini')
    }
  })

  it('selects cheapest provider for cost strategy', () => {
    const router = new SmartRouter('cost')
    
    const status = router.getStatus()
    const openai = status.find(p => p.name === 'openai')
    const gemini = status.find(p => p.name === 'gemini')
    
    if (openai && gemini) {
      openai.configured = true
      openai.healthy = true
      openai.costPer1kTokens = 0.002
      
      gemini.configured = true
      gemini.healthy = true
      gemini.costPer1kTokens = 0.0005
      
      const selected = router.selectProvider()
      expect(selected).toBe('gemini')
    }
  })

  it('excludes unhealthy providers', () => {
    const router = new SmartRouter()
    
    const status = router.getStatus()
    const openai = status.find(p => p.name === 'openai')
    
    if (openai) {
      openai.configured = true
      openai.healthy = false
      
      const selected = router.selectProvider()
      expect(selected).not.toBe('openai')
    }
  })

  it('records successful requests', () => {
    const router = new SmartRouter()
    
    router.recordResult('openai', true, 300)
    
    const status = router.getStatus()
    const openai = status.find(p => p.name === 'openai')
    
    expect(openai?.requestCount).toBe(1)
    expect(openai?.errorCount).toBe(0)
  })

  it('marks provider unhealthy after high error rate', () => {
    const router = new SmartRouter()
    
    const status = router.getStatus()
    const openai = status.find(p => p.name === 'openai')
    
    if (openai) {
      openai.configured = true
      openai.healthy = true
      
      // Simulate 3 failures
      router.recordResult('openai', false, 0)
      router.recordResult('openai', false, 0)
      router.recordResult('openai', false, 0)
      
      expect(openai.healthy).toBe(false)
    }
  })

  it('respects excluded providers', () => {
    const router = new SmartRouter()
    
    const status = router.getStatus()
    status.forEach(p => {
      p.configured = true
      p.healthy = true
    })
    
    const excluded = new Set(['openai', 'gemini'])
    const selected = router.selectProvider(excluded)
    
    expect(selected).not.toBe('openai')
    expect(selected).not.toBe('gemini')
  })
})
