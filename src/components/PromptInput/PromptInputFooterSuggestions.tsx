import * as React from 'react'
import { memo, type ReactNode } from 'react'
import { useTerminalSize } from '../../hooks/useTerminalSize.js'
import { stringWidth } from '../../ink/stringWidth.js'
import { Box, Text } from '../../ink.js'
import { truncatePathMiddle, truncateToWidth } from '../../utils/format.js'
import type { Theme } from '../../utils/theme.js'

export type SuggestionItem = {
  id: string
  displayText: string
  tag?: string
  description?: string
  metadata?: unknown
  color?: keyof Theme
  type?: SuggestionType
}

export type SuggestionType =
  | 'command'
  | 'file'
  | 'directory'
  | 'agent'
  | 'shell'
  | 'custom-title'
  | 'slack-channel'
  | 'none'

export const OVERLAY_MAX_ITEMS = 5

function getIcon(itemId: string): string {
  if (itemId.startsWith('file-')) return '+'
  if (itemId.startsWith('mcp-resource-')) return '◇'
  if (itemId.startsWith('agent-')) return '*'
  return '+'
}

function isUnifiedSuggestion(itemId: string): boolean {
  return (
    itemId.startsWith('file-') ||
    itemId.startsWith('mcp-resource-') ||
    itemId.startsWith('agent-')
  )
}

const SuggestionItemRow = memo(function SuggestionItemRow({
  item,
  maxColumnWidth,
  isSelected,
}: {
  item: SuggestionItem
  maxColumnWidth?: number
  isSelected: boolean
}): ReactNode {
  const { columns } = useTerminalSize()
  const selectedTextColor: keyof Theme | undefined = isSelected
    ? 'suggestion'
    : undefined

  if (isUnifiedSuggestion(item.id)) {
    const icon = getIcon(item.id)
    const isFile = item.id.startsWith('file-')
    const isMcpResource = item.id.startsWith('mcp-resource-')
    const separatorWidth = item.description ? 3 : 0
    let displayText = item.displayText

    if (isFile) {
      const descReserve = item.description
        ? Math.min(20, stringWidth(item.description))
        : 0
      const maxPathLength =
        columns - 2 - 4 - separatorWidth - descReserve
      displayText = truncatePathMiddle(item.displayText, maxPathLength)
    } else if (isMcpResource) {
      displayText = truncateToWidth(item.displayText, 30)
    }

    const availableWidth =
      columns - 2 - stringWidth(displayText) - separatorWidth - 4
    const description = item.description
      ? truncateToWidth(
          item.description.replace(/\s+/g, ' '),
          Math.max(0, availableWidth),
        )
      : ''
    const lineContent = description
      ? `${icon} ${displayText} – ${description}`
      : `${icon} ${displayText}`

    return (
      <Text
        color={selectedTextColor}
        dimColor={!isSelected}
        wrap="truncate"
      >
        {lineContent}
      </Text>
    )
  }

  const maxNameWidth = Math.floor(columns * 0.4)
  const displayTextWidth = Math.min(
    maxColumnWidth ?? stringWidth(item.displayText) + 5,
    maxNameWidth,
  )
  const rowTextColor: keyof Theme | undefined = selectedTextColor

  let displayText = item.displayText
  if (stringWidth(displayText) > displayTextWidth - 2) {
    displayText = truncateToWidth(displayText, displayTextWidth - 2)
  }

  const paddedDisplayText =
    displayText +
    ' '.repeat(Math.max(0, displayTextWidth - stringWidth(displayText)))
  const tagText = item.tag ? `[${item.tag}] ` : ''
  const tagWidth = stringWidth(tagText)
  const descriptionWidth = Math.max(
    0,
    columns - displayTextWidth - tagWidth - 4,
  )
  const description = item.description
    ? truncateToWidth(item.description.replace(/\s+/g, ' '), descriptionWidth)
    : ''

  return (
    <Text color={rowTextColor} dimColor={!isSelected} wrap="truncate">
      {paddedDisplayText}
      {tagText}
      {description}
    </Text>
  )
})

type Props = {
  suggestions: SuggestionItem[]
  selectedSuggestion: number
  maxColumnWidth?: number
  /**
   * When true, the suggestions are rendered inside a position=absolute
   * overlay. We omit minHeight and flex-end so the y-clamp in the
   * renderer doesn't push fewer items down into the prompt area.
   */
  overlay?: boolean
}

export function PromptInputFooterSuggestions({
  suggestions,
  selectedSuggestion,
  maxColumnWidth: maxColumnWidthProp,
  overlay,
}: Props): ReactNode {
  const { rows } = useTerminalSize()
  const scrollStartIndexRef = React.useRef(0)
  const maxVisibleItems = overlay
    ? OVERLAY_MAX_ITEMS
    : Math.min(6, Math.max(1, rows - 3))

  if (suggestions.length === 0) {
    return null
  }

  const maxColumnWidth =
    maxColumnWidthProp ??
    Math.max(...suggestions.map(item => stringWidth(item.displayText))) + 5
  const clampedSelectedSuggestion = Math.max(
    0,
    Math.min(selectedSuggestion, suggestions.length - 1),
  )
  const maxStartIndex = Math.max(0, suggestions.length - maxVisibleItems)
  let startIndex = Math.min(scrollStartIndexRef.current, maxStartIndex)
  if (clampedSelectedSuggestion < startIndex) {
    startIndex = clampedSelectedSuggestion
  } else if (clampedSelectedSuggestion >= startIndex + maxVisibleItems) {
    startIndex = clampedSelectedSuggestion - maxVisibleItems + 1
  }
  startIndex = Math.max(
    0,
    Math.min(startIndex, maxStartIndex),
  )
  scrollStartIndexRef.current = startIndex

  const endIndex = Math.min(startIndex + maxVisibleItems, suggestions.length)
  const visibleItems = suggestions.slice(startIndex, endIndex)

  return (
    <Box
      flexDirection="column"
      justifyContent={overlay ? undefined : 'flex-end'}
    >
      {visibleItems.map((item, index) => {
        const absoluteIndex = startIndex + index
        const isSelected = absoluteIndex === clampedSelectedSuggestion

        return (
          <SuggestionItemRow
            key={`${item.id}-${absoluteIndex}-${
              isSelected ? 'selected' : 'idle'
            }`}
            item={item}
            maxColumnWidth={maxColumnWidth}
            isSelected={isSelected}
          />
        )
      })}
    </Box>
  )
}

export default memo(PromptInputFooterSuggestions)
