import type { APIProvider } from './providers.js'

export interface EnhancedModelEntry {
  id: string
  provider: APIProvider
  displayName: string
  contextWindow: number
  costPer1kInput: number
  costPer1kOutput: number
  capabilities: {
    streaming: boolean
    functionCalling: boolean
    vision: boolean
    json: boolean
  }
  latencyClass: 'fast' | 'medium' | 'slow'
}

export const ENHANCED_MODEL_CATALOG: EnhancedModelEntry[] = [
  // Anthropic
  {
    id: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    displayName: 'Claude 3.5 Sonnet',
    contextWindow: 200000,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    capabilities: { streaming: true, functionCalling: true, vision: true, json: true },
    latencyClass: 'medium',
  },
  {
    id: 'claude-3-5-haiku-20241022',
    provider: 'anthropic',
    displayName: 'Claude 3.5 Haiku',
    contextWindow: 200000,
    costPer1kInput: 0.001,
    costPer1kOutput: 0.005,
    capabilities: { streaming: true, functionCalling: true, vision: true, json: true },
    latencyClass: 'fast',
  },
  
  // OpenAI
  {
    id: 'gpt-4o',
    provider: 'openai',
    displayName: 'GPT-4o',
    contextWindow: 128000,
    costPer1kInput: 0.0025,
    costPer1kOutput: 0.01,
    capabilities: { streaming: true, functionCalling: true, vision: true, json: true },
    latencyClass: 'medium',
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    displayName: 'GPT-4o Mini',
    contextWindow: 128000,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
    capabilities: { streaming: true, functionCalling: true, vision: true, json: true },
    latencyClass: 'fast',
  },
  
  // Gemini
  {
    id: 'gemini-2.0-flash-exp',
    provider: 'gemini',
    displayName: 'Gemini 2.0 Flash',
    contextWindow: 1000000,
    costPer1kInput: 0,
    costPer1kOutput: 0,
    capabilities: { streaming: true, functionCalling: true, vision: true, json: true },
    latencyClass: 'fast',
  },
  
  // Ollama
  {
    id: 'llama3.1:8b',
    provider: 'ollama',
    displayName: 'Llama 3.1 8B',
    contextWindow: 128000,
    costPer1kInput: 0,
    costPer1kOutput: 0,
    capabilities: { streaming: true, functionCalling: true, vision: false, json: true },
    latencyClass: 'fast',
  },
]

export function getEnhancedModelInfo(modelId: string): EnhancedModelEntry | null {
  return ENHANCED_MODEL_CATALOG.find(m => m.id === modelId) || null
}

export function getModelsByProvider(provider: APIProvider): EnhancedModelEntry[] {
  return ENHANCED_MODEL_CATALOG.filter(m => m.provider === provider)
}

export function getModelsByCapability(capability: keyof EnhancedModelEntry['capabilities']): EnhancedModelEntry[] {
  return ENHANCED_MODEL_CATALOG.filter(m => m.capabilities[capability])
}

export function getCheapestModel(provider?: APIProvider): EnhancedModelEntry | null {
  const models = provider 
    ? ENHANCED_MODEL_CATALOG.filter(m => m.provider === provider)
    : ENHANCED_MODEL_CATALOG
  
  return models.reduce((cheapest, current) => {
    const currentCost = current.costPer1kInput + current.costPer1kOutput
    const cheapestCost = cheapest.costPer1kInput + cheapest.costPer1kOutput
    return currentCost < cheapestCost ? current : cheapest
  }, models[0])
}

export function getFastestModel(provider?: APIProvider): EnhancedModelEntry | null {
  const models = provider 
    ? ENHANCED_MODEL_CATALOG.filter(m => m.provider === provider)
    : ENHANCED_MODEL_CATALOG
  
  return models.find(m => m.latencyClass === 'fast') || null
}
