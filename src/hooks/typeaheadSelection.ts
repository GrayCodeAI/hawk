import type { SuggestionItem } from '../components/PromptInput/PromptInputFooterSuggestions.js'

export function getPreservedSelection(
  prevSuggestions: SuggestionItem[],
  prevSelection: number,
  newSuggestions: SuggestionItem[],
): number {
  if (newSuggestions.length === 0) {
    return -1
  }

  if (prevSelection < 0) {
    return 0
  }

  const prevSelectedItem = prevSuggestions[prevSelection]
  if (!prevSelectedItem) {
    return 0
  }

  const newIndex = newSuggestions.findIndex(item => item.id === prevSelectedItem.id)

  return newIndex >= 0 ? newIndex : 0
}

export function getSelectionForSuggestionUpdate(
  prevSuggestions: SuggestionItem[],
  prevSelection: number,
  newSuggestions: SuggestionItem[],
  shouldResetSelection: boolean,
): number {
  if (shouldResetSelection) {
    return newSuggestions.length > 0 ? 0 : -1
  }

  return getPreservedSelection(prevSuggestions, prevSelection, newSuggestions)
}

export function getPreviousSuggestionIndex(
  selectedSuggestion: number,
  suggestionCount: number,
): number {
  if (suggestionCount === 0) {
    return -1
  }

  return selectedSuggestion <= 0
    ? suggestionCount - 1
    : selectedSuggestion - 1
}

export function getNextSuggestionIndex(
  selectedSuggestion: number,
  suggestionCount: number,
): number {
  if (suggestionCount === 0) {
    return -1
  }


  return selectedSuggestion >= suggestionCount - 1
    ? 0
    : selectedSuggestion + 1
}
