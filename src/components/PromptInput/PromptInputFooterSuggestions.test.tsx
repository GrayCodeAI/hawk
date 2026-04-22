import { describe, expect, it } from 'bun:test'
import chalk from 'chalk'
import { ThemeProvider } from '../design-system/ThemeProvider.js'
import { getTheme } from '../../utils/theme.js'
import { renderToAnsiString, renderToString } from '../../utils/staticRender.js'
import {
  OVERLAY_MAX_ITEMS,
  PromptInputFooterSuggestions,
  type SuggestionItem,
} from './PromptInputFooterSuggestions.js'

function ansiForeground(color: string): string {
  const match = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(color)
  if (!match) {
    throw new Error(`Expected rgb color, got ${color}`)
  }

  return `\u001B[38;2;${match[1]};${match[2]};${match[3]}m`
}

function commandSuggestion(index: number): SuggestionItem {
  const name = `/suggestion-${index}`
  return {
    id: name,
    displayText: name,
    description: `Description for ${name}`,
  }
}

function commandSuggestions(count: number): SuggestionItem[] {
  return Array.from({ length: count }, (_, index) => commandSuggestion(index))
}

describe('PromptInputFooterSuggestions', () => {
  it('does not add marker text to the selected suggestion', async () => {
    const suggestions = commandSuggestions(3)
    const selectedSuggestion = 1

    const output = await renderToString(
      <PromptInputFooterSuggestions
        suggestions={suggestions}
        selectedSuggestion={selectedSuggestion}
        overlay
      />,
      80,
    )

    const lines = output.trimEnd().split('\n')

    expect(lines).toHaveLength(suggestions.length)
    for (const [index, suggestion] of suggestions.entries()) {
      expect(lines[index]?.startsWith(suggestion.displayText)).toBe(true)
    }
  })

  it('lets the selected row move before scrolling the visible window', async () => {
    const suggestions = commandSuggestions(OVERLAY_MAX_ITEMS + 2)
    const selectedSuggestion = OVERLAY_MAX_ITEMS - 1

    const output = await renderToString(
      <PromptInputFooterSuggestions
        suggestions={suggestions}
        selectedSuggestion={selectedSuggestion}
        overlay
      />,
      80,
    )

    const lines = output.trimEnd().split('\n')

    expect(lines).toHaveLength(OVERLAY_MAX_ITEMS)
    expect(lines[0]?.startsWith(suggestions[0]?.displayText ?? '')).toBe(true)
    expect(
      lines.at(-1)?.startsWith(
        suggestions[selectedSuggestion]?.displayText ?? '',
      ),
    ).toBe(true)
  })

  it('keeps the selected suggestion visible after the list scrolls', async () => {
    const suggestions = commandSuggestions(OVERLAY_MAX_ITEMS + 2)
    const selectedSuggestion = suggestions.length - 1

    const output = await renderToString(
      <PromptInputFooterSuggestions
        suggestions={suggestions}
        selectedSuggestion={selectedSuggestion}
        overlay
      />,
      80,
    )

    const lines = output.trimEnd().split('\n')
    const selectedDisplayText = suggestions[selectedSuggestion]?.displayText

    expect(lines).toHaveLength(OVERLAY_MAX_ITEMS)
    expect(lines.at(-1)?.startsWith(selectedDisplayText ?? '')).toBe(true)
  })

  it('colors only the selected row text', async () => {
    const previousChalkLevel = chalk.level
    chalk.level = 3

    try {
      const suggestions: SuggestionItem[] = [
        {
          ...commandSuggestion(0),
          color: 'warning',
        },
        {
          ...commandSuggestion(1),
          color: 'success',
        },
      ]
      const output = await renderToAnsiString(
        <ThemeProvider initialState="dark" onThemeSave={() => {}}>
          <PromptInputFooterSuggestions
            suggestions={suggestions}
            selectedSuggestion={1}
            overlay
          />
        </ThemeProvider>,
        80,
      )

      const lines = output.trimEnd().split('\n')
      const theme = getTheme('dark')
      const inactiveColor = ansiForeground(theme.inactive)
      const suggestionColor = ansiForeground(theme.suggestion)
      const warningColor = ansiForeground(theme.warning)
      const successColor = ansiForeground(theme.success)

      expect(lines[0]?.startsWith(`${inactiveColor}/suggestion-0`)).toBe(
        true,
      )
      expect(lines[0]).not.toContain(warningColor)
      expect(lines[1]?.startsWith(`${suggestionColor}/suggestion-1`)).toBe(
        true,
      )
      expect(lines[1]).not.toContain(successColor)
    } finally {
      chalk.level = previousChalkLevel
    }
  })
})
