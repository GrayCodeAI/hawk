import { basename } from 'path'
import React from 'react'
import { logForDebugging } from 'src/utils/debug.js'
import { logError } from 'src/utils/log.js'
import { useDebounceCallback } from 'usehooks-ts'
import type { InputEvent, Key } from '../ink.js'
import {
  asPotentialFilePath,
  getImagePathFromClipboard,
  getImageFromClipboard,
  isImageFilePath,
  isMacFileReferencePath,
  PASTE_THRESHOLD,
  tryReadImageFromPath,
} from '../utils/imagePaste.js'
import type { ImageDimensions } from '../utils/imageResizer.js'
import { getPlatform } from '../utils/platform.js'

const CLIPBOARD_CHECK_DEBOUNCE_MS = 50
const PASTE_COMPLETION_TIMEOUT_MS = 100
const IMAGE_PATH_READ_TIMEOUT_MS = 2000

function tryReadImageFromPathWithTimeout(
  imagePath: string,
): Promise<Awaited<ReturnType<typeof tryReadImageFromPath>>> {
  return Promise.race<Awaited<ReturnType<typeof tryReadImageFromPath>>>([
    tryReadImageFromPath(imagePath),
    new Promise<Awaited<ReturnType<typeof tryReadImageFromPath>>>(resolve => {
      setTimeout(resolve, IMAGE_PATH_READ_TIMEOUT_MS, null)
    }),
  ])
}

function isLikelyScreenshotPathWithoutExtension(path: string): boolean {
  const normalized = path.toLowerCase()
  return (
    normalized.includes('temporaryitems') ||
    normalized.includes('screencaptureui') ||
    normalized.includes('/screenshot')
  )
}

function isLikelyPastedImagePath(path: string): boolean {
  const trimmed = path.trim()
  if (isImageFilePath(trimmed) || isMacFileReferencePath(trimmed)) {
    return true
  }

  const potential = asPotentialFilePath(trimmed)
  if (!potential) {
    return false
  }

  return isLikelyScreenshotPathWithoutExtension(potential)
}

function isPotentialImageReadPath(path: string): boolean {
  const trimmed = path.trim()
  if (isLikelyPastedImagePath(trimmed)) {
    return true
  }
  return asPotentialFilePath(trimmed) !== null
}

function isExplicitImageToken(path: string): boolean {
  const trimmed = path.trim()
  return isImageFilePath(trimmed) || isMacFileReferencePath(trimmed)
}

export function supportsClipboardImageFallback(
  platform: ReturnType<typeof getPlatform>,
): boolean {
  return (
    platform === 'macos' || platform === 'windows' || platform === 'linux'
  )
}

type PasteHandlerProps = {
  onPaste?: (text: string) => void
  onInput: (input: string, key: Key) => void
  onImagePaste?: (
    base64Image: string,
    mediaType?: string,
    filename?: string,
    dimensions?: ImageDimensions,
    sourcePath?: string,
  ) => void
  onImagePathPaste?: (sourcePath: string) => void
}

export function usePasteHandler({
  onPaste,
  onInput,
  onImagePaste,
  onImagePathPaste,
}: PasteHandlerProps): {
  wrappedOnInput: (input: string, key: Key, event: InputEvent) => void
  pasteState: {
    chunks: string[]
    timeoutId: ReturnType<typeof setTimeout> | null
  }
  isPasting: boolean
} {
  const [pasteState, setPasteState] = React.useState<{
    chunks: string[]
    timeoutId: ReturnType<typeof setTimeout> | null
  }>({ chunks: [], timeoutId: null })
  const [isPasting, setIsPasting] = React.useState(false)
  const isMountedRef = React.useRef(true)
  const pastePendingRef = React.useRef(false)

  const platform = React.useMemo(() => getPlatform(), [])
  const isMacOS = platform === 'macos'
  const canFallbackToClipboardImage = supportsClipboardImageFallback(platform)

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const checkClipboardForImageImpl = React.useCallback(() => {
    if (!onImagePaste || !isMountedRef.current) {
      setIsPasting(false)
      return
    }

    logForDebugging('[paste] checking clipboard for image/path')
    void getImageFromClipboard()
      .then(async imageData => {
        if (!isMountedRef.current) {
          return
        }

        if (imageData) {
          logForDebugging('[paste] clipboard image read success')
          onImagePaste(
            imageData.base64,
            imageData.mediaType,
            undefined,
            imageData.dimensions,
          )
        } else {
          logForDebugging('[paste] clipboard image read returned null')

          if (!onImagePathPaste) {
            return
          }

          const clipboardPathText = await getImagePathFromClipboard()
          if (!clipboardPathText || !isMountedRef.current) {
            return
          }

          const imagePathCandidates = clipboardPathText
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(isPotentialImageReadPath)

          if (imagePathCandidates.length === 0) {
            return
          }

          logForDebugging(
            `[paste] clipboard path fallback candidates=${imagePathCandidates.length}`,
          )

          let attachedAny = false
          for (const imagePath of imagePathCandidates) {
            const resolved = await tryReadImageFromPathWithTimeout(imagePath)
            if (resolved) {
              attachedAny = true
              onImagePaste(
                resolved.base64,
                resolved.mediaType,
                basename(resolved.path),
                resolved.dimensions,
                resolved.path,
              )
              continue
            }

            if (isExplicitImageToken(imagePath)) {
              attachedAny = true
              onImagePathPaste(imagePath)
            }
          }

          if (!attachedAny) {
            logForDebugging(
              '[paste] clipboard path fallback found no attachable image',
            )
          }
        }
      })
      .catch(error => {
        if (isMountedRef.current) {
          logError(error as Error)
        }
      })
      .finally(() => {
        if (isMountedRef.current) {
          setIsPasting(false)
        }
      })
  }, [onImagePaste, onImagePathPaste])

  const checkClipboardForImage = useDebounceCallback(
    checkClipboardForImageImpl,
    CLIPBOARD_CHECK_DEBOUNCE_MS,
  )

  const resetPasteTimeout = React.useCallback(
    (currentTimeoutId: ReturnType<typeof setTimeout> | null) => {
      if (currentTimeoutId) {
        clearTimeout(currentTimeoutId)
      }
      return setTimeout(
        (
          setPasteState,
          onImagePaste,
          onPaste,
          setIsPasting,
          checkClipboardForImage,
          isMacOS,
          pastePendingRef,
          onImagePathPaste,
        ) => {
          pastePendingRef.current = false
          setPasteState(({ chunks }) => {
            const pastedText = chunks.join('').replace(/\[I$/, '').replace(/\[O$/, '')

            const lines = pastedText
              .split(/ (?=\/|[A-Za-z]:\\)/)
              .flatMap(part => part.split('\n'))
              .filter(line => line.trim())
            const imagePaths = lines.filter(isPotentialImageReadPath)

            logForDebugging(
              `[paste] buffered paste len=${pastedText.length} lines=${lines.length} pathCandidates=${imagePaths.length} sample=${JSON.stringify(pastedText.slice(0, 160))}`,
            )

            if (onImagePaste && imagePaths.length > 0) {
              const isTempScreenshot =
                /temporaryitems|screencaptureui|screen\s?shot|screenshot/i.test(
                  pastedText,
                )

              void Promise.all(
                imagePaths.map(imagePath =>
                  tryReadImageFromPathWithTimeout(imagePath),
                ),
              ).then(results => {
                const validImages = results.filter(
                  (r): r is NonNullable<typeof r> => r !== null,
                )

                if (validImages.length > 0) {
                  logForDebugging(
                    `[paste] resolved ${validImages.length} image path candidate(s)`,
                  )
                  for (const imageData of validImages) {
                    const filename = basename(imageData.path)
                    onImagePaste(
                      imageData.base64,
                      imageData.mediaType,
                      filename,
                      imageData.dimensions,
                      imageData.path,
                    )
                  }
                  const nonImageLines = lines.filter(
                    line => !isLikelyPastedImagePath(line),
                  )
                  if (nonImageLines.length > 0 && onPaste) {
                    onPaste(nonImageLines.join('\n'))
                  }
                  setIsPasting(false)
                } else if (isMacOS && isTempScreenshot) {
                  logForDebugging(
                    `[paste] screenshot path unresolved; trying clipboard fallback`,
                  )
                  checkClipboardForImage()
                  // Fallback: if clipboard check doesn't complete, still clear isPasting
                  setTimeout(() => setIsPasting(false), 500)
                } else if (onImagePathPaste) {
                  const explicitImagePaths = imagePaths.filter(isExplicitImageToken)
                  if (explicitImagePaths.length === 0) {
                    if (onPaste) {
                      onPaste(pastedText)
                    }
                    setIsPasting(false)
                    return
                  }
                  // Image paths detected but couldn't read them - create pending placeholders
                  for (const imagePath of explicitImagePaths) {
                    onImagePathPaste(imagePath)
                  }
                  const nonImageLines = lines.filter(
                    line => !isLikelyPastedImagePath(line),
                  )
                  if (nonImageLines.length > 0 && onPaste) {
                    onPaste(nonImageLines.join('\n'))
                  }
                  setIsPasting(false)
                } else {
                  if (onPaste) {
                    onPaste(pastedText)
                  }
                  setIsPasting(false)
                }
              }).catch(error => {
                logError(error as Error)
                setIsPasting(false)
              })
              return { chunks: [], timeoutId: null }
            }

            if (
              canFallbackToClipboardImage &&
              onImagePaste &&
              pastedText.length === 0
            ) {
              checkClipboardForImage()
              // Fallback: if clipboard check doesn't complete, still clear isPasting
              setTimeout(() => setIsPasting(false), 500)
              return { chunks: [], timeoutId: null }
            }

            if (onPaste) {
              onPaste(pastedText)
            }
            setIsPasting(false)
            return { chunks: [], timeoutId: null }
          })
        },
        PASTE_COMPLETION_TIMEOUT_MS,
        setPasteState,
        onImagePaste,
        onPaste,
        setIsPasting,
        checkClipboardForImage,
        isMacOS,
        pastePendingRef,
        onImagePathPaste,
      )
    },
    [
      checkClipboardForImage,
      canFallbackToClipboardImage,
      isMacOS,
      onImagePaste,
      onPaste,
      onImagePathPaste,
    ],
  )

  const wrappedOnInput = (input: string, key: Key, event: InputEvent): void => {
    const isFromPaste = event.keypress.isPasted

    if (isFromPaste) {
      setIsPasting(true)
    }

    const hasImageFilePath = input
      .split(/ (?=\/|[A-Za-z]:\\)/)
      .flatMap(part => part.split('\n'))
      .some(isLikelyPastedImagePath)

    if (
      isFromPaste &&
      input.length === 0 &&
      canFallbackToClipboardImage &&
      onImagePaste
    ) {
      checkClipboardForImage()
      setIsPasting(false)
      return
    }

    const shouldHandleAsPaste =
      onPaste &&
      (input.length > PASTE_THRESHOLD ||
        pastePendingRef.current ||
        hasImageFilePath ||
        isFromPaste)

    if (shouldHandleAsPaste) {
      pastePendingRef.current = true
      setPasteState(({ chunks, timeoutId }) => ({
        chunks: [...chunks, input],
        timeoutId: resetPasteTimeout(timeoutId),
      }))
      return
    }

    onInput(input, key)
    // Always reset isPasting after handling input, regardless of input length.
    // The input.length > 10 check was a workaround for stdin buffer chunking,
    // but any paste event should clear the pasting state once processed.
    setIsPasting(false)
  }

  return {
    wrappedOnInput,
    pasteState,
    isPasting,
  }
}
