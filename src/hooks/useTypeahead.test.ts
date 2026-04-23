import { describe, expect, it } from 'bun:test'
import type { SuggestionItem } from '../components/PromptInput/PromptInputFooterSuggestions.js'
import {
  getNextSuggestionIndex,
  getPreservedSelection,
  getPreviousSuggestionIndex,
  getSelectionForSuggestionUpdate,
} from './typeaheadSelection.js'

function suggestion(id: string): SuggestionItem {
  return {
    id,
    displayText: id,
  }
}

describe('getPreservedSelection', () => {
  it('keeps the selected suggestion when a recomputed list still contains it', () => {
    const previousSuggestions = [
      suggestion('/update-config'),
      suggestion('/init'),
      suggestion('/statusline'),
    ]
    const newSuggestions = [
      suggestion('/update-config'),
      suggestion('/init'),
      suggestion('/statusline'),
      suggestion('/add-dir'),
    ]

    expect(getPreservedSelection(previousSuggestions, 1, newSuggestions)).toBe(1)
  })

  it('tracks the selected suggestion if its index changes after recompute', () => {
    const previousSuggestions = [
      suggestion('/update-config'),
      suggestion('/init'),
      suggestion('/statusline'),
    ]
    const newSuggestions = [
      suggestion('/init'),
      suggestion('/update-config'),
      suggestion('/statusline'),
    ]

    expect(getPreservedSelection(previousSuggestions, 1, newSuggestions)).toBe(0)
  })

  it('resets to the first row when the previous selection is unavailable', () => {
    expect(
      getPreservedSelection(
        [suggestion('/update-config')],
        0,
        [suggestion('/init')],
      ),
    ).toBe(0)
  })

  it('returns no selection for an empty list', () => {
    expect(getPreservedSelection([suggestion('/init')], 0, [])).toBe(-1)
  })
})

describe('suggestion arrow navigation', () => {
  it('moves down one row at a time and wraps at the end', () => {
    expect(getNextSuggestionIndex(-1, 3)).toBe(0)
    expect(getNextSuggestionIndex(0, 3)).toBe(1)
    expect(getNextSuggestionIndex(1, 3)).toBe(2)
    expect(getNextSuggestionIndex(2, 3)).toBe(0)
  })


  it('moves up one row at a time and wraps at the beginning', () => {
    expect(getPreviousSuggestionIndex(-1, 3)).toBe(2)
    expect(getPreviousSuggestionIndex(2, 3)).toBe(1)
    expect(getPreviousSuggestionIndex(1, 3)).toBe(0)
    expect(getPreviousSuggestionIndex(0, 3)).toBe(2)
  })

  it('does not select anything when there are no suggestions', () => {
    expect(getNextSuggestionIndex(0, 0)).toBe(-1)
    expect(getPreviousSuggestionIndex(0, 0)).toBe(-1)
  })
})

describe('getSelectionForSuggestionUpdate', () => {
  it('resets to the first row when the filter input changes', () => {
    const previousSuggestions = [
      suggestion('/command-one'),
      suggestion('/command-two'),
      suggestion('/command-three'),
    ]
    const newSuggestions = [
      suggestion('/command-one'),
      suggestion('/command-two'),
      suggestion('/command-three'),
    ]

    expect(
      getSelectionForSuggestionUpdate(previousSuggestions, 1, newSuggestions, true),
    ).toBe(0)
  })

  it('preserves arrow-key selection when the same filter refreshes', () => {
    const previousSuggestions = [
      suggestion('/command-one'),
      suggestion('/command-two'),
      suggestion('/command-three'),
    ]
    const newSuggestions = [
      suggestion('/command-one'),
      suggestion('/command-two'),
      suggestion('/command-three'),
    ]

    expect(
      getSelectionForSuggestionUpdate(previousSuggestions, 1, newSuggestions, false),
    ).toBe(1)
  })
})
