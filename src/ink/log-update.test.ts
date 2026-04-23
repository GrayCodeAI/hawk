import { describe, expect, it } from 'bun:test'
import type { Frame } from './frame.js'
import { LogUpdate } from './log-update.js'
import {
  CellWidth,
  CharPool,
  createScreen,
  HyperlinkPool,
  setCellAt,
  type Screen,
  StylePool,
} from './screen.js'

const ERASE_TO_END_OF_LINE = '\x1B[K'

function frame(screen: Screen, width = 20, height = 4): Frame {
  return {
    screen,
    viewport: { width, height },
    cursor: { x: 0, y: 0, visible: true },
  }
}

function screenWithText(
  text: string,
  width: number,
  stylePool: StylePool,
  charPool: CharPool,
  hyperlinkPool: HyperlinkPool,
): Screen {
  const screen = createScreen(width, 1, stylePool, charPool, hyperlinkPool)
  for (let x = 0; x < text.length; x++) {
    setCellAt(screen, x, 0, {
      char: text[x]!,
      styleId: stylePool.none,
      width: CellWidth.Narrow,
      hyperlink: undefined,
    })
  }
  screen.damage = undefined
  return screen
}

describe('LogUpdate', () => {
  it('clears full-width damaged row tails even when virtual tail cells match', () => {
    const stylePool = new StylePool()
    const charPool = new CharPool()
    const hyperlinkPool = new HyperlinkPool()
    const width = 20
    const prev = screenWithText('abc', width, stylePool, charPool, hyperlinkPool)
    const next = screenWithText('abc', width, stylePool, charPool, hyperlinkPool)
    next.damage = { x: 0, y: 0, width, height: 1 }

    const diff = new LogUpdate({ isTTY: true, stylePool }).render(
      frame(prev, width),
      frame(next, width),
    )
    const stdout = diff
      .filter(patch => patch.type === 'stdout')
      .map(patch => patch.content)
      .join('')

    expect(stdout).toContain(ERASE_TO_END_OF_LINE)
  })

  it('does not clear row tails for narrow damage regions', () => {
    const stylePool = new StylePool()
    const charPool = new CharPool()
    const hyperlinkPool = new HyperlinkPool()
    const width = 20
    const prev = screenWithText('abc', width, stylePool, charPool, hyperlinkPool)
    const next = screenWithText('abc', width, stylePool, charPool, hyperlinkPool)
    next.damage = { x: 0, y: 0, width: 3, height: 1 }

    const diff = new LogUpdate({ isTTY: true, stylePool }).render(
      frame(prev, width),
      frame(next, width),
    )
    const stdout = diff
      .filter(patch => patch.type === 'stdout')
      .map(patch => patch.content)
      .join('')

    expect(stdout).not.toContain(ERASE_TO_END_OF_LINE)
  })
})
