import type { LocalJSXCommandOnDone } from '../../types/command.js'
import {
  getProviderCatalogDebugSnapshot,
  refreshProviderCatalogNow,
} from '../../utils/model/providerCatalog.js'

export async function call(
  onDone: LocalJSXCommandOnDone,
): Promise<undefined> {
  try {
    await refreshProviderCatalogNow()
    const snapshot = getProviderCatalogDebugSnapshot()
    onDone(
      `Model catalog refreshed.\nsource: ${snapshot.source}\nupdated_at: ${snapshot.updatedAt}\ncache_path: ${snapshot.cachePath}`,
      { display: 'system' },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    onDone(`Model catalog refresh failed: ${message}`, { display: 'system' })
  }
}
