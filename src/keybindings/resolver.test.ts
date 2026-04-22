import { describe, expect, it } from 'bun:test'
import type { Key } from '../ink.js'
import { DEFAULT_BINDINGS } from './defaultBindings.js'
import { parseBindings } from './parser.js'
import { resolveKeyWithChordState } from './resolver.js'

const parsedDefaultBindings = parseBindings(DEFAULT_BINDINGS)

function wheelKey(direction: 'up' | 'down'): Key {
  return {
    ctrl: false,
    shift: false,
    meta: false,
    super: false,
    wheelUp: direction === 'up',
    wheelDown: direction === 'down',
  } as Key
}

function arrowKey(direction: 'up' | 'down'): Key {
  return {
    ctrl: false,
    shift: false,
    meta: false,
    super: false,
    upArrow: direction === 'up',
    downArrow: direction === 'down',
  } as Key
}

function ctrlLetterKey(): Key {
  return {
    ctrl: true,
    shift: false,
    meta: false,
    super: false,
  } as Key
}

describe('resolveKeyWithChordState navigation bindings', () => {
  it('leaves wheel events unbound when autocomplete is inactive', () => {
    expect(
      resolveKeyWithChordState(
        '',
        wheelKey('up'),
        ['Scroll', 'Global'],
        parsedDefaultBindings,
        null,
      ),
    ).toEqual({ type: 'none' })

    expect(
      resolveKeyWithChordState(
        '',
        wheelKey('down'),
        ['Scroll', 'Global'],
        parsedDefaultBindings,
        null,
      ),
    ).toEqual({ type: 'none' })
  })

  it('uses wheel events for autocomplete navigation', () => {
    expect(
      resolveKeyWithChordState(
        '',
        wheelKey('up'),
        ['Autocomplete', 'Global'],
        parsedDefaultBindings,
        null,
      ),
    ).toEqual({ type: 'match', action: 'autocomplete:previous' })

    expect(
      resolveKeyWithChordState(
        '',
        wheelKey('down'),
        ['Autocomplete', 'Global'],
        parsedDefaultBindings,
        null,
      ),
    ).toEqual({ type: 'match', action: 'autocomplete:next' })
  })

  it('uses wheel events for settings row navigation without arrow boundary behavior', () => {
    expect(
      resolveKeyWithChordState(
        '',
        wheelKey('up'),
        ['Settings', 'Global'],
        parsedDefaultBindings,
        null,
      ),
    ).toEqual({ type: 'match', action: 'scroll:lineUp' })

    expect(
      resolveKeyWithChordState(
        '',
        wheelKey('down'),
        ['Settings', 'Global'],
        parsedDefaultBindings,
        null,
      ),
    ).toEqual({ type: 'match', action: 'scroll:lineDown' })
  })

  it('uses arrow keys for one-row autocomplete navigation', () => {
    expect(
      resolveKeyWithChordState(
        '',
        arrowKey('up'),
        ['Autocomplete', 'Scroll', 'Global'],
        parsedDefaultBindings,
        null,
      ),
    ).toEqual({ type: 'match', action: 'autocomplete:previous' })

    expect(
      resolveKeyWithChordState(
        '',
        arrowKey('down'),
        ['Autocomplete', 'Scroll', 'Global'],
        parsedDefaultBindings,
        null,
      ),
    ).toEqual({ type: 'match', action: 'autocomplete:next' })
  })

  it('does not bind ctrl-n or ctrl-p for autocomplete navigation', () => {
    expect(
      resolveKeyWithChordState(
        'p',
        ctrlLetterKey(),
        ['Autocomplete', 'Scroll', 'Global'],
        parsedDefaultBindings,
        null,
      ),
    ).toEqual({ type: 'none' })

    expect(
      resolveKeyWithChordState(
        'n',
        ctrlLetterKey(),
        ['Autocomplete', 'Scroll', 'Global'],
        parsedDefaultBindings,
        null,
      ),
    ).toEqual({ type: 'none' })
  })
})
