import { describe, expect, it, mock } from 'bun:test'
import chalk from 'chalk'
import figures from 'figures'
import * as React from 'react'
import { PassThrough } from 'stream'
import { DEFAULT_BINDINGS } from '../../keybindings/defaultBindings.js'
import { parseBindings } from '../../keybindings/parser.js'
import type {
  KeybindingContextName,
  ParsedKeystroke,
} from '../../keybindings/types.js'
import { getTheme } from '../../utils/theme.js'
import type { OptionWithDescription } from './select.js'

type TestHandlerRegistration = {
  action: string
  context: KeybindingContextName
  handler: () => void
}

mock.module('@graycode-ai/sandbox-runtime', () => ({
  SandboxManager: class {
    static checkDependencies() {
      return []
    }
    static isSupportedPlatform() {
      return false
    }
  },
  SandboxRuntimeConfigSchema: {
    parse: (value: unknown) => value,
  },
  SandboxViolationStore: class {},
}))

function ansiForeground(color: string): string {
  const match = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(color)
  if (!match) {
    throw new Error(`Expected rgb color, got ${color}`)
  }

  return `\u001B[38;2;${match[1]};${match[2]};${match[3]}m`
}

const SYNC_START = '\x1B[?2026h'
const SYNC_END = '\x1B[?2026l'
const parsedDefaultBindings = parseBindings(DEFAULT_BINDINGS)

function extractFrames(output: string): string[] {
  const frames: string[] = []
  let searchFrom = 0
  while (searchFrom < output.length) {
    const startIndex = output.indexOf(SYNC_START, searchFrom)
    if (startIndex === -1) {
      break
    }
    const contentStart = startIndex + SYNC_START.length
    const endIndex = output.indexOf(SYNC_END, contentStart)
    if (endIndex === -1) {
      break
    }
    frames.push(output.slice(contentStart, endIndex))
    searchFrom = endIndex + SYNC_END.length
  }

  return frames.length === 0 ? [output] : frames
}

function extractFirstFrame(output: string): string {
  return extractFrames(output)[0] ?? output
}

function includesAnsiText(output: string, color: string, text: string): boolean {
  let searchFrom = 0
  while (searchFrom < output.length) {
    const colorIndex = output.indexOf(color, searchFrom)
    if (colorIndex === -1) {
      return false
    }
    const textIndex = output.indexOf(text, colorIndex + color.length)
    if (textIndex !== -1) {
      const nextResetIndex = output.indexOf(
        '\x1B[39m',
        colorIndex + color.length,
      )
      if (nextResetIndex === -1 || textIndex < nextResetIndex) {
        return true
      }
    }
    searchFrom = colorIndex + color.length
  }

  return false
}

function includesStyledPointerForText(
  output: string,
  color: string,
  text: string,
): boolean {
  let searchFrom = 0
  while (searchFrom < output.length) {
    const textIndex = output.indexOf(text, searchFrom)
    if (textIndex === -1) {
      return false
    }

    const rowStart = Math.max(
      output.lastIndexOf('\n', textIndex),
      output.lastIndexOf('\r', textIndex),
    )
    const pointerIndex = output.lastIndexOf(figures.pointer, textIndex)
    if (pointerIndex > rowStart) {
      const colorIndex = output.lastIndexOf(color, pointerIndex)
      const resetIndex = output.lastIndexOf('\x1B[39m', pointerIndex)
      if (colorIndex > resetIndex) {
        return true
      }
    }

    searchFrom = textIndex + text.length
  }

  return false
}

const ANSI_SEQUENCE_PATTERN = new RegExp(
  `${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`,
  'g',
)

function strippedAnsi(output: string): string {
  return output.replace(ANSI_SEQUENCE_PATTERN, '')
}

function TestKeybindingProvider({
  KeybindingProvider,
  children,
}: {
  KeybindingProvider: typeof import('../../keybindings/KeybindingContext.js').KeybindingProvider
  children: React.ReactNode
}): React.ReactNode {
  const pendingChordRef = React.useRef<ParsedKeystroke[] | null>(null)
  const [pendingChord, setPendingChord] = React.useState<
    ParsedKeystroke[] | null
  >(null)
  const activeContexts = React.useMemo(
    () => new Set<KeybindingContextName>(),
    [],
  )
  const registerActiveContext = React.useCallback(
    (context: KeybindingContextName) => {
      activeContexts.add(context)
    },
    [activeContexts],
  )
  const unregisterActiveContext = React.useCallback(
    (context: KeybindingContextName) => {
      activeContexts.delete(context)
    },
    [activeContexts],
  )
  const handlerRegistryRef = React.useRef(
    new Map<string, Set<TestHandlerRegistration>>(),
  )

  return (
    <KeybindingProvider
      bindings={parsedDefaultBindings}
      pendingChordRef={pendingChordRef}
      pendingChord={pendingChord}
      setPendingChord={setPendingChord}
      activeContexts={activeContexts}
      registerActiveContext={registerActiveContext}
      unregisterActiveContext={unregisterActiveContext}
      handlerRegistryRef={handlerRegistryRef}
    >
      {children}
    </KeybindingProvider>
  )
}

function createRenderStreams(): {
  outputRef: { value: string }
  stdout: PassThrough
  stdin: NodeJS.ReadStream
} {
  const outputRef = { value: '' }
  const stdout = new PassThrough()
  ;(stdout as unknown as { columns: number }).columns = 80
  stdout.on('data', chunk => {
    outputRef.value += chunk.toString()
  })

  return {
    outputRef,
    stdout,
    stdin: createTestStdin(),
  }
}

function createTestStdin(): NodeJS.ReadStream {
  const stdin = new PassThrough() as NodeJS.ReadStream & {
    isRaw?: boolean
    setRawMode: (rawMode: boolean) => NodeJS.ReadStream
  }
  stdin.isTTY = true
  stdin.isRaw = false
  stdin.setRawMode = rawMode => {
    stdin.isRaw = rawMode
    return stdin
  }
  stdin.ref = () => stdin
  stdin.unref = () => stdin
  return stdin
}

describe('Select', () => {
  it('colors the focused two-column row with the suggestion color', async () => {
    const previousChalkLevel = chalk.level
    chalk.level = 3

    try {
      const [{ render, useApp }, { ThemeProvider }, { Select }] =
        await Promise.all([
          import('../../ink.js'),
          import('../design-system/ThemeProvider.js'),
          import('./select.js'),
        ])
      const RenderOnceAndExit = ({
        children,
      }: {
        children: React.ReactNode
      }): React.ReactNode => {
        const { exit } = useApp()
        React.useLayoutEffect(() => {
          const timer = setTimeout(exit, 0)
          return () => clearTimeout(timer)
        }, [exit])
        return <>{children}</>
      }
      const options: OptionWithDescription<string>[] = [
        {
          value: 'model-one',
          label: 'Model one',
          description: 'Primary description',
        },
        {
          value: 'model-two',
          label: 'Model two',
          description: 'Selected description',
        },
      ]

      let output = ''
      const stdout = new PassThrough()
      ;(stdout as unknown as { columns: number }).columns = 80
      stdout.on('data', chunk => {
        output += chunk.toString()
      })
      const instance = await render(
        <RenderOnceAndExit>
          <ThemeProvider initialState="dark" onThemeSave={() => {}}>
            <Select
              options={options}
              defaultValue="model-two"
              defaultFocusValue="model-one"
              visibleOptionCount={2}
            />
          </ThemeProvider>
        </RenderOnceAndExit>,
        {
          stdout: stdout as unknown as NodeJS.WriteStream,
          stdin: createTestStdin(),
          patchConsole: false,
        },
      )
      await instance.waitUntilExit()

      const lines = extractFirstFrame(output).trimEnd().split('\n')
      const focusedLine = lines.find(line => line.includes('Model one')) ?? ''
      const selectedLine = lines.find(line => line.includes('Model two')) ?? ''
      const theme = getTheme('dark')
      const suggestionColor = ansiForeground(theme.suggestion)
      const successColor = ansiForeground(theme.success)

      expect(focusedLine).toContain(`${suggestionColor}1. Model one`)
      expect(focusedLine).toContain(`${suggestionColor}Primary description`)
      expect(includesStyledPointerForText(output, suggestionColor, '1. Model one')).toBe(
        true,
      )
      expect(selectedLine).toContain(`${successColor}2. Model two`)
      expect(selectedLine).toContain(`${successColor}Selected description`)
    } finally {
      chalk.level = previousChalkLevel
    }
  })

  it('recolors a two-column row when keyboard focus moves to it', async () => {
    const previousChalkLevel = chalk.level
    chalk.level = 3

    try {
      const [
        { render, useApp },
        { ThemeProvider },
        { Select },
        { KeybindingProvider },
      ] = await Promise.all([
        import('../../ink.js'),
        import('../design-system/ThemeProvider.js'),
        import('./select.js'),
        import('../../keybindings/KeybindingContext.js'),
      ])
      const options: OptionWithDescription<string>[] = [
        {
          value: 'model-one',
          label: 'Model-one',
          description: 'Primary-description',
        },
        {
          value: 'model-two',
          label: 'Model-two',
          description: 'Secondary-description',
        },
        {
          value: 'model-three',
          label: 'Model-three',
          description: 'Selected-description',
        },
      ]

      const RenderSelectAndExit = (): React.ReactNode => {
        const { exit } = useApp()
        const [focusedValue, setFocusedValue] = React.useState<
          string | undefined
        >()

        React.useEffect(() => {
          const timer = setTimeout(exit, 250)
          return () => clearTimeout(timer)
        }, [exit])

        React.useEffect(() => {
          if (focusedValue !== 'model-two') {
            return
          }
          const timer = setTimeout(exit, 100)
          return () => clearTimeout(timer)
        }, [exit, focusedValue])

        return (
          <TestKeybindingProvider KeybindingProvider={KeybindingProvider}>
            <ThemeProvider initialState="dark" onThemeSave={() => {}}>
              <Select
                options={options}
                defaultValue="model-three"
                defaultFocusValue="model-one"
                visibleOptionCount={3}
                onFocus={setFocusedValue}
              />
            </ThemeProvider>
          </TestKeybindingProvider>
        )
      }

      const { outputRef, stdout, stdin } = createRenderStreams()
      const instance = await render(<RenderSelectAndExit />, {
        stdout: stdout as unknown as NodeJS.WriteStream,
        stdin,
        patchConsole: false,
      })

      await new Promise(resolve => setTimeout(resolve, 50))
      ;(stdin as unknown as PassThrough).write('\x1B[B')
      await instance.waitUntilExit()

      const output = outputRef.value
      const outputText = strippedAnsi(output)
      const theme = getTheme('dark')
      const suggestionColor = ansiForeground(theme.suggestion)

      expect(outputText).toContain('2. Model-two')
      expect(includesAnsiText(output, suggestionColor, '2. Model-two')).toBe(
        true,
      )
      expect(
        includesAnsiText(output, suggestionColor, 'Secondary-description'),
      ).toBe(true)
      expect(
        includesStyledPointerForText(output, suggestionColor, '2. Model-two'),
      ).toBe(true)
    } finally {
      chalk.level = previousChalkLevel
    }
  })

  it('repaints the full two-column row so stale terminal tail cells are cleared', async () => {
    const [{ renderToScreen }, { ThemeProvider }, { Select }] =
      await Promise.all([
        import('../../ink/render-to-screen.js'),
        import('../design-system/ThemeProvider.js'),
        import('./select.js'),
      ])

    const { screen } = renderToScreen(
      <ThemeProvider initialState="dark" onThemeSave={() => {}}>
        <Select
          options={[
            {
              value: 'model-one',
              label: 'A',
              description: 'Short',
            },
          ]}
          defaultValue="model-one"
          defaultFocusValue="model-one"
          visibleOptionCount={1}
        />
      </ThemeProvider>,
      80,
    )

    expect(screen.damage).toEqual(
      expect.objectContaining({
        x: 0,
        width: 80,
      }),
    )
  })
})
