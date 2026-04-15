import type { ProviderProfile } from './providerConfig.js'

interface CostEntry {
  provider: ProviderProfile
  model: string
  inputTokens: number
  outputTokens: number
  costUSD: number
  timestamp: number
}

const sessionCosts: CostEntry[] = []
let totalSessionCost = 0

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  // Anthropic
  'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
  'claude-3-5-haiku-20241022': { input: 0.001, output: 0.005 },
  'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
  
  // OpenAI
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  
  // Gemini
  'gemini-2.0-flash-exp': { input: 0.0, output: 0.0 },
  'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
  
  // Grok
  'grok-2': { input: 0.005, output: 0.015 },
  
  // Ollama (local)
  'llama3.1:8b': { input: 0, output: 0 },
  'qwen2.5-coder:7b': { input: 0, output: 0 },
}

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = MODEL_COSTS[model]
  if (!costs) return 0
  
  return (inputTokens / 1000) * costs.input + (outputTokens / 1000) * costs.output
}

export function trackProviderCost(
  provider: ProviderProfile,
  model: string,
  inputTokens: number,
  outputTokens: number
): void {
  const cost = calculateCost(model, inputTokens, outputTokens)
  
  sessionCosts.push({
    provider,
    model,
    inputTokens,
    outputTokens,
    costUSD: cost,
    timestamp: Date.now(),
  })
  
  totalSessionCost += cost
}

export function getSessionCost(): number {
  return totalSessionCost
}

export function getCostByProvider(): Record<ProviderProfile, number> {
  const byProvider: Partial<Record<ProviderProfile, number>> = {}
  
  for (const entry of sessionCosts) {
    byProvider[entry.provider] = (byProvider[entry.provider] || 0) + entry.costUSD
  }
  
  return byProvider as Record<ProviderProfile, number>
}

export function resetSessionCost(): void {
  sessionCosts.length = 0
  totalSessionCost = 0
}

export function formatCost(costUSD: number): string {
  if (costUSD === 0) return '$0.00'
  if (costUSD < 0.01) return `$${(costUSD * 100).toFixed(4)}¢`
  return `$${costUSD.toFixed(4)}`
}
