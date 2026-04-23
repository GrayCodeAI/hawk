import { mkdir, open } from 'fs/promises'
import { join } from 'path'
import { getSessionId } from '../bootstrap/state.js'
import type { PastedContent } from './config.js'
import { logForDebugging } from './debug.js'
import { getHawkConfigHomeDir } from './envUtils.js'
import { getFsImplementation } from './fsOperations.js'

const IMAGE_STORE_DIR = 'image-cache'
const MAX_STORED_IMAGE_PATHS = 200

// In-memory cache of stored image paths
const storedImagePaths = new Map<number, string>()

/**
 * Get the image store directory for the current session.
 */
function getImageStoreDir(): string {
  return join(getHawkConfigHomeDir(), IMAGE_STORE_DIR, getSessionId())
}

/**
 * Ensure the image store directory exists.
 */
async function ensureImageStoreDir(): Promise<void> {
  const dir = getImageStoreDir()
  await mkdir(dir, { recursive: true })
}

async function writeImageToDisk(
  imagePath: string,
  base64Content: string,
): Promise<void> {
  const fh = await open(imagePath, 'w', 0o600)
  try {
    await fh.writeFile(base64Content, { encoding: 'base64' })
  } finally {
    await fh.close()
  }
}

/**
 * Get the file path for an image by ID.
 */
function getImagePath(imageId: number, mediaType: string): string {
  const extension = mediaType.split('/')[1] || 'png'
  return join(getImageStoreDir(), `${imageId}.${extension}`)
}

/**
 * Cache the image path immediately (fast, no file I/O).
 */
export function cacheImagePath(content: PastedContent): string | null {
  if (content.type !== 'image') {
    return null
  }
  const imagePath = getImagePath(content.id, content.mediaType || 'image/png')
  evictOldestIfAtCap()
  storedImagePaths.set(content.id, imagePath)
  return imagePath
}

/**
 * Store an image from pastedContents to disk.
 */
export async function storeImage(
  content: PastedContent,
): Promise<string | null> {
  if (content.type !== 'image' || content.content.length === 0) {
    return null
  }

  try {
    await ensureImageStoreDir()
    const imagePath = getImagePath(content.id, content.mediaType || 'image/png')
    await writeImageToDisk(imagePath, content.content)
    evictOldestIfAtCap()
    storedImagePaths.set(content.id, imagePath)
    logForDebugging(`Stored image ${content.id} to ${imagePath}`)
    return imagePath
  } catch (error) {
    logForDebugging(`Failed to store image: ${error}`)
    return null
  }
}

/**
 * Store all images from pastedContents to disk.
 */
export async function storeImages(
  pastedContents: Record<number, PastedContent>,
): Promise<Map<number, string>> {
  const pathMap = new Map<number, string>()

  const imageContents = Object.values(pastedContents).filter(
    (content): content is PastedContent =>
      content.type === 'image' && content.content.length > 0,
  )

  if (imageContents.length === 0) {
    return pathMap
  }

  try {
    await ensureImageStoreDir()
  } catch (error) {
    logForDebugging(`Failed to create image cache directory: ${error}`)
    return pathMap
  }

  await Promise.all(
    imageContents.map(async content => {
      try {
        const imagePath = getImagePath(content.id, content.mediaType || 'image/png')
        await writeImageToDisk(imagePath, content.content)
        evictOldestIfAtCap()
        storedImagePaths.set(content.id, imagePath)
        pathMap.set(content.id, imagePath)
        logForDebugging(`Stored image ${content.id} to ${imagePath}`)
      } catch (error) {
        logForDebugging(`Failed to store image ${content.id}: ${error}`)
      }
    }),
  )

  return pathMap
}

/**
 * Get the file path for a stored image by ID.
 */
export function getStoredImagePath(imageId: number): string | null {
  return storedImagePaths.get(imageId) ?? null
}

/**
 * Clear the in-memory cache of stored image paths.
 */
export function clearStoredImagePaths(): void {
  storedImagePaths.clear()
}

function evictOldestIfAtCap(): void {
  while (storedImagePaths.size >= MAX_STORED_IMAGE_PATHS) {
    const oldest = storedImagePaths.keys().next().value
    if (oldest !== undefined) {
      storedImagePaths.delete(oldest)
    } else {
      break
    }
  }
}

/**
 * Clean up old image cache directories from previous sessions.
 */
export async function cleanupOldImageCaches(): Promise<void> {
  const fsImpl = getFsImplementation()
  const baseDir = join(getHawkConfigHomeDir(), IMAGE_STORE_DIR)
  const currentSessionId = getSessionId()

  try {
    let sessionDirs
    try {
      sessionDirs = await fsImpl.readdir(baseDir)
    } catch {
      return
    }

    for (const sessionDir of sessionDirs) {
      if (sessionDir.name === currentSessionId) {
        continue
      }

      const sessionPath = join(baseDir, sessionDir.name)
      try {
        await fsImpl.rm(sessionPath, { recursive: true, force: true })
        logForDebugging(`Cleaned up old image cache: ${sessionPath}`)
      } catch {
        // Ignore errors for individual directories
      }
    }

    try {
      const remaining = await fsImpl.readdir(baseDir)
      if (remaining.length === 0) {
        await fsImpl.rmdir(baseDir)
      }
    } catch {
      // Ignore
    }
  } catch {
    // Ignore errors reading base directory
  }
}
