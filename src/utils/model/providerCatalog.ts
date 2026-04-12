import {
  fetchModelCatalog,
  loadModelCatalogSync,
  modelsForProvider,
  type ModelCatalog,
  type ModelCatalogEntry,
} from '@hawk/eyrie'
import { existsSync, readFileSync } from 'node:fs'
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

function getProviderConfigPath(): string {
  return join(getHawkConfigHomeDir(), 'provider.json')
}

function getCatalogRefreshEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env }
  if (env.OPENROUTER_API_KEY) return env

  try {
    const path = getProviderConfigPath()
    if (!existsSync(path)) return env
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as {
      openrouter_api_key?: string
      openrouter_base_url?: string
    }
    const key = parsed?.openrouter_api_key?.trim()
    if (!key) return env
    env.OPENROUTER_API_KEY = key
    if (!env.OPENROUTER_BASE_URL && parsed.openrouter_base_url?.trim()) {
      env.OPENROUTER_BASE_URL = parsed.openrouter_base_url.trim()
    }
  } catch {
    // Best effort only.
  }
  return env
}

function ensureCatalogInitialized(): void {
  if (cachedCatalog === null) {
    cachedCatalog = loadModelCatalogSync(getModelCatalogCachePath())
  }
  if (!refreshStarted) {
    refreshStarted = true
    void fetchModelCatalog(getModelCatalogCachePath(), undefined, getCatalogRefreshEnv()).then(
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
  const latest = await fetchModelCatalog(
    getModelCatalogCachePath(),
    undefined,
    getCatalogRefreshEnv(),
  )
  cachedCatalog = latest
  refreshStarted = true
}

export function getProviderCatalogDebugSnapshot(): ProviderCatalogDebugSnapshot {
  ensureCatalogInitialized()

  const catalog = cachedCatalog
  const providers: APIProvider[] = [
    'anthropic',
    'openai',
    'canopywave',
    'openrouter',
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
