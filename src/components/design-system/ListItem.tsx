import figures from 'figures'
import type { ReactNode } from 'react'
import React from 'react'
import { useDeclaredCursor } from '../../ink/hooks/use-declared-cursor.js'
import { Box, Text } from '../../ink.js'

type ListItemProps = {
  isFocused: boolean
  isSelected?: boolean
  children: ReactNode
  description?: string
  showScrollDown?: boolean
  showScrollUp?: boolean
  styled?: boolean
  disabled?: boolean
  declareCursor?: boolean
}

export function ListItem({
  isFocused,
  isSelected = false,
  children,
  description,
  showScrollDown,
  showScrollUp,
  styled = true,
  disabled = false,
  declareCursor,
}: ListItemProps): React.ReactNode {
  function renderIndicator(): ReactNode {
    if (disabled) return <Text> </Text>
    if (isFocused) {
      return (
        <Text color={isSelected ? 'success' : 'suggestion'}>
          {figures.pointer}
        </Text>
      )
    }
    if (showScrollDown) return <Text dimColor>{figures.arrowDown}</Text>
    if (showScrollUp) return <Text dimColor>{figures.arrowUp}</Text>
    return <Text> </Text>
  }

  let textColor: 'success' | 'suggestion' | 'inactive' | undefined
  if (disabled) textColor = 'inactive'
  else if (!styled) textColor = undefined
  else if (isSelected) textColor = 'success'
  else if (isFocused) textColor = 'suggestion'

  const cursorRef = useDeclaredCursor({
    line: 0,
    column: 0,
    active: isFocused && !disabled && declareCursor !== false,
  })

  return (
    <Box ref={cursorRef} flexDirection="column">
      <Box flexDirection="row" gap={1}>
        {renderIndicator()}
        {styled ? (
          <Text color={textColor} dimColor={disabled}>
            {children}
          </Text>
        ) : (
          children
        )}
        {isSelected && !disabled && <Text color="success">{figures.tick}</Text>}
      </Box>
      {description && (
        <Box paddingLeft={2} key={description}>
          <Text color="inactive" wrap="wrap">{description}</Text>
        </Box>
      )}
    </Box>
  )
}
