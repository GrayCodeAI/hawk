import { feature } from 'bun:bundle'
import { randomBytes } from 'crypto'
import { execa } from 'execa'
import { homedir } from 'os'
import { basename, extname, isAbsolute, join } from 'path'
import { fileURLToPath } from 'url'
import {
  IMAGE_MAX_HEIGHT,
  IMAGE_MAX_WIDTH,
  IMAGE_TARGET_RAW_SIZE,
} from '@hawk/eyrie'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '../services/analytics/growthbook.js'
import { getImageProcessor } from '../tools/FileReadTool/imageProcessor.js'
import { getCwd } from './cwd.js'
import { logForDebugging } from './debug.js'
import { execFileNoThrowWithCwd } from './execFileNoThrow.js'
import { getFsImplementation } from './fsOperations.js'
import {
  detectImageFormatFromBase64,
  type ImageDimensions,
  maybeResizeAndDownsampleImageBuffer,
} from './imageResizer.js'
import { logError } from './log.js'
import type { PastedContent } from './config.js'

// Native NSPasteboard reader. GrowthBook gate tengu_collage_kaleidoscope is
// a kill switch (default on). Falls through to osascript when off.
// The gate string is inlined at each callsite INSIDE the feature() condition
// — module-scope helpers are NOT tree-shaken (see docs/feature-gating.md).

type SupportedPlatform = 'darwin' | 'linux' | 'win32'

// Threshold in characters for when to consider text a "large paste"
export const PASTE_THRESHOLD = 800
function getClipboardCommands() {
  const platform = process.platform as SupportedPlatform

  // Platform-specific temporary file paths
  // Use HAWK_CODE_TMPDIR if set, otherwise fall back to platform defaults
  const baseTmpDir =
    process.env.HAWK_CODE_TMPDIR ||
    (platform === 'win32' ? process.env.TEMP || 'C:\\Temp' : '/tmp')
  const screenshotFilename = 'hawk_cli_latest_screenshot.png'
  const tempPaths: Record<SupportedPlatform, string> = {
    darwin: join(baseTmpDir, screenshotFilename),
    linux: join(baseTmpDir, screenshotFilename),
    win32: join(baseTmpDir, screenshotFilename),
  }

  const screenshotPath = tempPaths[platform] || tempPaths.linux

  // Platform-specific clipboard commands
  const commands: Record<
    SupportedPlatform,
    {
      checkImage: string
      saveImage: string
      getPath: string
      deleteFile: string
    }
  > = {
    darwin: {
      checkImage: `osascript -e 'the clipboard as «class PNGf»'`,
      saveImage: `osascript -e 'set png_data to (the clipboard as «class PNGf»)' -e 'set fp to open for access POSIX file "${screenshotPath}" with write permission' -e 'write png_data to fp' -e 'close access fp'`,
      getPath: `osascript -e 'get POSIX path of (the clipboard as «class furl»)'`,
      deleteFile: `rm -f "${screenshotPath}"`,
    },
    linux: {
      checkImage:
        'xclip -selection clipboard -t TARGETS -o 2>/dev/null | grep -E "image/(png|jpeg|jpg|gif|webp|bmp)" || wl-paste -l 2>/dev/null | grep -E "image/(png|jpeg|jpg|gif|webp|bmp)"',
      saveImage: `xclip -selection clipboard -t image/png -o > "${screenshotPath}" 2>/dev/null || wl-paste --type image/png > "${screenshotPath}" 2>/dev/null || xclip -selection clipboard -t image/bmp -o > "${screenshotPath}" 2>/dev/null || wl-paste --type image/bmp > "${screenshotPath}"`,
      getPath:
        'xclip -selection clipboard -t text/plain -o 2>/dev/null || wl-paste 2>/dev/null',
      deleteFile: `rm -f "${screenshotPath}"`,
    },
    win32: {
      checkImage:
        'powershell -NoProfile -Command "(Get-Clipboard -Format Image) -ne $null"',
      saveImage: `powershell -NoProfile -Command "$img = Get-Clipboard -Format Image; if ($img) { $img.Save('${screenshotPath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png) }"`,
      getPath: 'powershell -NoProfile -Command "Get-Clipboard"',
      deleteFile: `del /f "${screenshotPath}"`,
    },
  }

  return {
    commands: commands[platform] || commands.linux,
    screenshotPath,
  }
}

export type ImageWithDimensions = {
  base64: string
  mediaType: string
  dimensions?: ImageDimensions
}

/**
 * Check if clipboard contains an image without retrieving it.
 */
export async function hasImageInClipboard(): Promise<boolean> {
  if (process.platform !== 'darwin') {
    return false
  }
  if (
    feature('NATIVE_CLIPBOARD_IMAGE') &&
    getFeatureValue_CACHED_MAY_BE_STALE('tengu_collage_kaleidoscope', true)
  ) {
    // Native NSPasteboard check (~0.03ms warm). Fall through to osascript
    // when the module/export is missing. Catch a throw too: it would surface
    // as an unhandled rejection in useClipboardImageHint's setTimeout.
    try {
      const { getNativeModule } = await import('image-processor-napi')
      const hasImage = getNativeModule()?.hasClipboardImage
      if (hasImage) {
        return hasImage()
      }
    } catch (e) {
      logError(e as Error)
    }
  }
  const result = await execFileNoThrowWithCwd('osascript', [
    '-e',
    'the clipboard as «class PNGf»',
  ])
  return result.code === 0
}

export async function getImageFromClipboard(): Promise<ImageWithDimensions | null> {
  // Fast path: native NSPasteboard reader (macOS only). Reads PNG bytes
  // directly in-process and downsamples via CoreGraphics if over the
  // dimension cap. ~5ms cold, sub-ms warm — vs. ~1.5s for the osascript
  // path below. Throws if the native module is unavailable, in which case
  // the catch block falls through to osascript. A `null` return from the
  // native call is authoritative (clipboard has no image).
  if (
    feature('NATIVE_CLIPBOARD_IMAGE') &&
    process.platform === 'darwin' &&
    getFeatureValue_CACHED_MAY_BE_STALE('tengu_collage_kaleidoscope', true)
  ) {
    try {
      const { getNativeModule } = await import('image-processor-napi')
      const readClipboard = getNativeModule()?.readClipboardImage
      if (!readClipboard) {
        throw new Error('native clipboard reader unavailable')
      }
      const native = readClipboard(IMAGE_MAX_WIDTH, IMAGE_MAX_HEIGHT)
      if (!native) {
        return null
      }
      // The native path caps dimensions but not file size. A complex
      // 2000×2000 PNG can still exceed the 3.75MB raw / 5MB base64 API
      // limit — for that edge case, run through the same size-cap that
      // the osascript path uses (degrades to JPEG if needed). Cheap if
      // already under: just a sharp metadata read.
      const buffer: Buffer = native.png
      if (buffer.length > IMAGE_TARGET_RAW_SIZE) {
        const resized = await maybeResizeAndDownsampleImageBuffer(
          buffer,
          buffer.length,
          'png',
        )
        return {
          base64: resized.buffer.toString('base64'),
          mediaType: `image/${resized.mediaType}`,
          // resized.dimensions sees the already-downsampled buffer; native knows the true originals.
          dimensions: {
            originalWidth: native.originalWidth,
            originalHeight: native.originalHeight,
            displayWidth: resized.dimensions?.displayWidth ?? native.width,
            displayHeight: resized.dimensions?.displayHeight ?? native.height,
          },
        }
      }
      return {
        base64: buffer.toString('base64'),
        mediaType: 'image/png',
        dimensions: {
          originalWidth: native.originalWidth,
          originalHeight: native.originalHeight,
          displayWidth: native.width,
          displayHeight: native.height,
        },
      }
    } catch (e) {
      logError(e as Error)
      // Fall through to osascript fallback.
    }
  }

  const { commands, screenshotPath } = getClipboardCommands()
  try {
    // Check if clipboard has image
    const checkResult = await execa(commands.checkImage, {
      shell: true,
      reject: false,
    })
    if (checkResult.exitCode !== 0) {
      return null
    }

    // Save the image
    const saveResult = await execa(commands.saveImage, {
      shell: true,
      reject: false,
    })
    if (saveResult.exitCode !== 0) {
      return null
    }

    // Read the image and convert to base64
    let imageBuffer = getFsImplementation().readFileBytesSync(screenshotPath)

    // BMP is not supported by the API — convert to PNG via Sharp.
    // This handles WSL2 where Windows copies images as BMP by default.
    if (
      imageBuffer.length >= 2 &&
      imageBuffer[0] === 0x42 &&
      imageBuffer[1] === 0x4d
    ) {
      const sharp = await getImageProcessor()
      imageBuffer = await sharp(imageBuffer).png().toBuffer()
    }

    // Resize if needed to stay under 5MB API limit
    const resized = await maybeResizeAndDownsampleImageBuffer(
      imageBuffer,
      imageBuffer.length,
      'png',
    )
    const base64Image = resized.buffer.toString('base64')

    // Detect format from magic bytes
    const mediaType = detectImageFormatFromBase64(base64Image)

    // Cleanup (fire-and-forget, don't await)
    void execa(commands.deleteFile, { shell: true, reject: false })

    return {
      base64: base64Image,
      mediaType,
      dimensions: resized.dimensions,
    }
  } catch {
    return null
  }
}

export async function getImagePathFromClipboard(): Promise<string | null> {
  const { commands } = getClipboardCommands()

  try {
    // Try to get text from clipboard
    const result = await execa(commands.getPath, {
      shell: true,
      reject: false,
    })
    if (result.exitCode !== 0 || !result.stdout) {
      return null
    }
    return result.stdout.trim()
  } catch (e) {
    logError(e as Error)
    return null
  }
}

/**
 * Regex pattern to match supported image file extensions. Kept in sync with
 * MIME_BY_EXT in BriefTool/upload.ts — attachments.ts uses this to set isImage
 * on the wire, and remote viewers fetch /preview iff isImage is true. An ext
 * here but not in MIME_BY_EXT (e.g. bmp) uploads as octet-stream and has no
 * /preview variant → broken thumbnail.
 */
export const IMAGE_EXTENSION_REGEX =
  /\.(png|jpe?g|gif|webp|bmp|tiff?|heic|heif|avif)$/i

const MAC_FILE_REFERENCE_REGEX = /^(?:file:\/\/\/\.file\/id=|\/\.file\/id=)/i
const MAC_FILE_REFERENCE_RESOLVE_TIMEOUT_MS = 1500

/**
 * Remove outer single or double quotes from a string
 * @param text Text to clean
 * @returns Text without outer quotes
 */
function removeOuterQuotes(text: string): string {
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1)
  }
  return text
}

function stripPathControlChars(text: string): string {
  return text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
}

/**
 * Remove common outer wrappers used by terminals around pasted paths.
 */
function stripOuterWrappers(text: string): string {
  const withoutQuotes = removeOuterQuotes(stripPathControlChars(text))
  if (
    (withoutQuotes.startsWith('<') && withoutQuotes.endsWith('>')) ||
    (withoutQuotes.startsWith('(') && withoutQuotes.endsWith(')'))
  ) {
    return withoutQuotes.slice(1, -1)
  }
  return withoutQuotes
}

/**
 * Remove shell escape backslashes from a path (for macOS/Linux/WSL)
 * On Windows systems, this function returns the path unchanged
 * @param path Path that might contain shell-escaped characters
 * @returns Path with escape backslashes removed (on macOS/Linux/WSL only)
 */
function stripBackslashEscapes(path: string): string {
  const platform = process.platform as SupportedPlatform

  // On Windows, don't remove backslashes as they're part of the path
  if (platform === 'win32') {
    return path
  }

  // On macOS/Linux/WSL, handle shell-escaped paths
  // Double-backslashes (\\) represent actual backslashes in the filename
  // Single backslashes followed by special chars are shell escapes

  // First, temporarily replace double backslashes with a placeholder
  // Use random salt to prevent injection attacks where path contains literal placeholder
  const salt = randomBytes(8).toString('hex')
  const placeholder = `__DOUBLE_BACKSLASH_${salt}__`
  const withPlaceholder = path.replace(/\\\\/g, placeholder)

  // Remove single backslashes that are shell escapes
  // This handles cases like "name\ \(15\).png" -> "name (15).png"
  const withoutEscapes = withPlaceholder.replace(/\\(.)/g, '$1')

  // Replace placeholders back to single backslashes
  return withoutEscapes.replace(new RegExp(placeholder, 'g'), '\\')
}

/**
 * Convert a terminal-pasted path-like token into a local filesystem path.
 * Supports:
 * - file:// URIs (common in some terminal drag/drop flows)
 * - ~/ paths (macOS/Linux)
 */
function normalizePathToken(path: string): string {
  if (MAC_FILE_REFERENCE_REGEX.test(path)) {
    return path
  }

  if (/^file:\/\//i.test(path)) {
    try {
      return fileURLToPath(path)
    } catch {
      return path
    }
  }

  if (path === '~') {
    return homedir()
  }

  if (path.startsWith('~/')) {
    return join(homedir(), path.slice(2))
  }

  return path
}

function trimTrailingPathNoise(text: string): string {
  return text.replace(/[\s\])}>,"']+$/g, '')
}

export function extractPotentialFilePaths(text: string): string[] {
  const sanitized = stripPathControlChars(text)
  const candidates = new Set<string>()

  const addCandidate = (candidate: string) => {
    const trimmed = trimTrailingPathNoise(candidate.trim())
    if (!trimmed) return
    candidates.add(trimmed)
  }

  addCandidate(sanitized)
  for (const line of sanitized.split(/\r?\n/)) {
    addCandidate(line)
  }

  for (const match of sanitized.matchAll(/file:\/\/[^\s<>"']+/gi)) {
    addCandidate(match[0])
  }

  for (const match of sanitized.matchAll(/(?:\/|[A-Za-z]:\\)[^\r\n\t]+/g)) {
    addCandidate(match[0])
  }

  return [...candidates]
}

export function isMacFileReferencePath(text: string): boolean {
  return MAC_FILE_REFERENCE_REGEX.test(text.trim())
}

export function isPureFilePathPaste(
  text: string,
  candidates: string[],
): boolean {
  if (candidates.length === 0) {
    return false
  }

  let remaining = stripPathControlChars(text)
  for (const candidate of [...candidates].sort((a, b) => b.length - a.length)) {
    remaining = remaining.replaceAll(candidate, ' ')
  }

  return remaining.replace(/[\s<>"'()[\],]+/g, '').length === 0
}

async function resolveMacFileReferencePath(
  input: string,
): Promise<string | null> {
  if (process.platform !== 'darwin') {
    return null
  }

  const urlString = input.startsWith('/.file/id=') ? `file://${input}` : input
  if (!/^file:\/\/\/\.file\/id=/i.test(urlString)) {
    return null
  }

  const script = `
function run(argv) {
  ObjC.import('Foundation');
  const url = $.NSURL.URLWithString(argv[0]);
  if (!url) return '';
  const filePathUrl = url.filePathURL;
  if (!filePathUrl) return '';
  const path = filePathUrl.path;
  return path ? ObjC.unwrap(path) : '';
}
`.trim()

  const result = await execFileNoThrowWithCwd('osascript', [
    '-l',
    'JavaScript',
    '-e',
    script,
    '--',
    urlString,
  ], {
    timeout: MAC_FILE_REFERENCE_RESOLVE_TIMEOUT_MS,
  })

  if (result.code !== 0) {
    return null
  }

  const resolved = result.stdout.trim()
  return resolved || null
}

/**
 * Check if a given text represents an image file path
 * @param text Text to check
 * @returns Boolean indicating if text is an image path
 */
export function isImageFilePath(text: string): boolean {
  const cleaned = stripOuterWrappers(text.trim())
  const unescaped = stripBackslashEscapes(cleaned)
  const normalized = normalizePathToken(unescaped)
  return IMAGE_EXTENSION_REGEX.test(normalized)
}

/**
 * Clean and normalize a text string that might be an image file path
 * @param text Text to process
 * @returns Cleaned text with quotes removed, whitespace trimmed, and shell escapes removed, or null if not an image path
 */
export function asImageFilePath(text: string): string | null {
  const cleaned = stripOuterWrappers(text.trim())
  const unescaped = stripBackslashEscapes(cleaned)
  const normalized = normalizePathToken(unescaped)

  if (IMAGE_EXTENSION_REGEX.test(normalized)) {
    return normalized
  }

  return null
}

/**
 * Parse text as a filesystem path token even if it has no image extension.
 */
export function asPotentialFilePath(text: string): string | null {
  const cleaned = stripOuterWrappers(text.trim())
  const unescaped = stripBackslashEscapes(cleaned)
  const normalized = normalizePathToken(unescaped)

  if (
    /^file:\/\//i.test(normalized) ||
    /^\/\.file\/id=/i.test(normalized) ||
    isAbsolute(normalized) ||
    /^[A-Za-z]:\\/.test(normalized)
  ) {
    return normalized
  }

  return null
}

/**
 * Lightweight file signature check for common image formats.
 */
function hasKnownImageSignature(buffer: Uint8Array): boolean {
  if (buffer.length < 12) return false

  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return true
  }
  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true
  }
  // GIF
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return true
  }
  // WebP (RIFF....WEBP)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return true
  }
  // BMP
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return true
  }
  // TIFF
  if (
    (buffer[0] === 0x49 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x2a &&
      buffer[3] === 0x00) ||
    (buffer[0] === 0x4d &&
      buffer[1] === 0x4d &&
      buffer[2] === 0x00 &&
      buffer[3] === 0x2a)
  ) {
    return true
  }
  // HEIC/HEIF/AVIF ISO BMFF brands
  if (
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70
  ) {
    const brand = String.fromCharCode(
      buffer[8] ?? 0,
      buffer[9] ?? 0,
      buffer[10] ?? 0,
      buffer[11] ?? 0,
    ).toLowerCase()
    if (
      [
        'heic',
        'heif',
        'heix',
        'hevc',
        'avif',
        'avis',
        'mif1',
        'msf1',
      ].includes(brand)
    ) {
      return true
    }
  }

  return false
}

/**
 * Try to find and read an image file, falling back to clipboard search
 * @param text Pasted text that might be an image filename or path
 * @returns Object containing the image path and base64 data, or null if not found
 */
export async function tryReadImageFromPath(
  text: string,
): Promise<(ImageWithDimensions & { path: string }) | null> {
  // Strip terminal added spaces or quotes to dragged in paths
  const explicitImagePath = asImageFilePath(text)
  const cleanedPath = explicitImagePath ?? asPotentialFilePath(text)

  if (!cleanedPath) {
    return null
  }

  let imagePath = cleanedPath
  let imageBuffer

  try {
    const resolvedReference = await resolveMacFileReferencePath(imagePath)
    if (resolvedReference) {
      imagePath = resolvedReference
    }

    if (isAbsolute(imagePath)) {
      imageBuffer = getFsImplementation().readFileBytesSync(imagePath)
    } else {
      const cwdPath = join(getCwd(), imagePath)
      if (getFsImplementation().existsSync(cwdPath)) {
        imageBuffer = getFsImplementation().readFileBytesSync(cwdPath)
        imagePath = cwdPath
      }
      // VSCode Terminal just grabs the text content which is the filename
      // instead of getting the full path of the file pasted with cmd-v. So
      // we check if it matches the filename of the image in the clipboard.
      if (!imageBuffer) {
        const clipboardPath = await getImagePathFromClipboard()
        if (clipboardPath && imagePath === basename(clipboardPath)) {
          imageBuffer = getFsImplementation().readFileBytesSync(clipboardPath)
          imagePath = clipboardPath
        }
      }
    }
  } catch (e) {
    logError(e as Error)
    return null
  }
  if (!imageBuffer) {
    return null
  }
  if (imageBuffer.length === 0) {
    logForDebugging(`Image file is empty: ${imagePath}`, { level: 'warn' })
    return null
  }

  // If the path did not have a recognized image extension, require a known
  // image signature so we don't treat arbitrary dropped files as images.
  if (!explicitImagePath && !hasKnownImageSignature(imageBuffer)) {
    return null
  }

  try {
    const inputExt = extname(imagePath).slice(1).toLowerCase()
    const nativeApiFormats = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp'])

    // BMP is not supported by the API — convert to PNG via Sharp.
    if (
      imageBuffer.length >= 2 &&
      imageBuffer[0] === 0x42 &&
      imageBuffer[1] === 0x4d
    ) {
      const sharp = await getImageProcessor()
      imageBuffer = await sharp(imageBuffer).png().toBuffer()
    }

    // Convert formats not accepted directly by the API (e.g. heic/tiff/avif)
    // to PNG so drag/drop from macOS Photos/Finder still works.
    if (!nativeApiFormats.has(inputExt)) {
      const sharp = await getImageProcessor()
      imageBuffer = await sharp(imageBuffer).png().toBuffer()
    }

    // Resize if needed to stay under 5MB API limit
    // Extract extension from path for format hint
    const ext = nativeApiFormats.has(inputExt) ? inputExt : 'png'
    const resized = await maybeResizeAndDownsampleImageBuffer(
      imageBuffer,
      imageBuffer.length,
      ext,
    )
    const base64Image = resized.buffer.toString('base64')

    // Detect format from the actual file contents using magic bytes
    const mediaType = detectImageFormatFromBase64(base64Image)
    return {
      path: imagePath,
      base64: base64Image,
      mediaType,
      dimensions: resized.dimensions,
    }
  } catch (e) {
    logError(e as Error)
    return null
  }
}

export async function resolvePastedImageContent(
  content: PastedContent,
): Promise<PastedContent | null> {
  if (content.type !== 'image') {
    return null
  }

  if (content.content.length > 0) {
    return content
  }

  if (!content.sourcePath) {
    return null
  }

  const resolved = await tryReadImageFromPath(content.sourcePath)
  if (!resolved) {
    return null
  }

  return {
    ...content,
    content: resolved.base64,
    mediaType: resolved.mediaType || content.mediaType || 'image/png',
    dimensions: resolved.dimensions ?? content.dimensions,
    filename: content.filename || basename(resolved.path),
    sourcePath: resolved.path,
  }
}
