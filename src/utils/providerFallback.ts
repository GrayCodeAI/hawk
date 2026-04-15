import { getSmartRouter } from '../services/api/smartRouter.js'
import type { ProviderProfile } from './providerConfig.js'
import { logForDebugging } from './debug.js'

export interface FallbackOptions {
  maxAttempts?: number
  excludeProviders?: Set<string>
  onFallback?: (provider: ProviderProfile, error: Error) => void
}

export async function withProviderFallback<T>(
  operation: (provider: ProviderProfile) => Promise<T>,
  options: FallbackOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    excludeProviders = new Set(),
    onFallback,
  } = options

  const router = getSmartRouter()
  await router.initialize()

  const attempted = new Set<string>()
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const combinedExclusions = new Set([...excludeProviders, ...attempted])
    const provider = router.selectProvider(combinedExclusions)

    if (!provider) {
      throw new Error(
        `No providers available after ${attempt} attempts. ` +
        `Last error: ${lastError?.message || 'unknown'}`
      )
    }

    attempted.add(provider)
    const startTime = Date.now()

    try {
      logForDebugging(`[Fallback] Attempt ${attempt + 1}: Using provider ${provider}`)
      const result = await operation(provider)
      
      const duration = Date.now() - startTime
      router.recordResult(provider, true, duration)
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      router.recordResult(provider, false, duration)
      
      lastError = error instanceof Error ? error : new Error(String(error))
      
      logForDebugging(
        `[Fallback] Provider ${provider} failed: ${lastError.message}`
      )
      
      if (onFallback) {
        onFallback(provider, lastError)
      }

      if (attempt === maxAttempts - 1) {
        throw lastError
      }
    }
  }

  throw lastError || new Error('Provider fallback failed')
}
