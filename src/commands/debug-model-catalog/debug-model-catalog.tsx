import type { LocalJSXCommandOnDone } from '../../types/command.js'
import { getProviderCatalogDebugSnapshot } from '../../utils/model/providerCatalog.js'

export async function call(
  onDone: LocalJSXCommandOnDone,
): Promise<undefined> {
  const snapshot = getProviderCatalogDebugSnapshot()
  const lines = [
    'Model Catalog Debug',
    `source: ${snapshot.source}`,
    `updated_at: ${snapshot.updatedAt}`,
    `cache_path: ${snapshot.cachePath}`,
    `anthropic: ${snapshot.providerCounts.anthropic}`,
    `openai: ${snapshot.providerCounts.openai}`,
    `grok: ${snapshot.providerCounts.grok}`,
    `gemini: ${snapshot.providerCounts.gemini}`,
    `ollama: ${snapshot.providerCounts.ollama}`,
  ]

  onDone(lines.join('\n'), { display: 'system' })
}
