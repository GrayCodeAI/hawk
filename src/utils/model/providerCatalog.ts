import {
  fetchModelCatalog,
  loadModelCatalogSync,
  modelsForProvider,
  type ModelCatalog,
  type ModelCatalogEntry,
} from '@hawk/eyrie'
import { homedir } from 'os'
import { join } from 'path'
import type { APIProvider } from './providers.js'

let cachedCatalog: ModelCatalog | null = null
let refreshStarted = false

function getHawkConfigHomeDir(): string {
  return (process.env.HAWK_CONFIG_DIR ?? join(homedir(), '.hawk')).normalize(
    'NFC',
  )
}

function getModelCatalogCachePath(): string {
  return join(getHawkConfigHomeDir(), 'model_catalog.json')
}

function ensureCatalogInitialized(): void {
  if (cachedCatalog === null) {
    cachedCatalog = loadModelCatalogSync(getModelCatalogCachePath())
  }
  if (!refreshStarted) {
    refreshStarted = true
    void fetchModelCatalog(getModelCatalogCachePath()).then(
      latest => {
        cachedCatalog = latest
      },
      () => {
        // Best effort only. Keep embedded/cache catalog on failures.
      },
    )
  }
}

/**
 * Provider model IDs from the eyrie catalog (cache/default immediately,
 * refreshed in background).
 */
export function getProviderCatalogModelIds(
  provider: APIProvider,
): Set<string> | null {
  ensureCatalogInitialized()
  if (!cachedCatalog) return null
  const entries = modelsForProvider(cachedCatalog, provider)
  if (entries.length === 0) return null
  return new Set(entries.map(e => e.id))
}

export function getProviderCatalogEntries(
  provider: APIProvider,
): ModelCatalogEntry[] {
  ensureCatalogInitialized()
  if (!cachedCatalog) return []
  return modelsForProvider(cachedCatalog, provider)
}

export type ProviderCatalogDebugSnapshot = {
  cachePath: string
  source: string
  updatedAt: string
  providerCounts: Record<APIProvider, number>
}

export async function refreshProviderCatalogNow(): Promise<void> {
  const latest = await fetchModelCatalog(getModelCatalogCachePath())
  cachedCatalog = latest
  refreshStarted = true
}

export function getProviderCatalogDebugSnapshot(): ProviderCatalogDebugSnapshot {
  ensureCatalogInitialized()

  const catalog = cachedCatalog
  const providers: APIProvider[] = [
    'anthropic',
    'openai',
    'grok',
    'gemini',
    'ollama',
  ]

  const providerCounts = Object.fromEntries(
    providers.map(provider => [
      provider,
      modelsForProvider(catalog, provider).length,
    ]),
  ) as Record<APIProvider, number>

  return {
    cachePath: getModelCatalogCachePath(),
    source: catalog?.source ?? 'unknown',
    updatedAt: catalog?.updated_at ?? 'unknown',
    providerCounts,
  }
}
