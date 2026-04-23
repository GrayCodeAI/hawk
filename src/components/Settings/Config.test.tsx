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

const SYNC_START = '\x1B[?2026h'
const SYNC_END = '\x1B[?2026l'
const parsedDefaultBindings = parseBindings(DEFAULT_BINDINGS)
const ANSI_SEQUENCE_PATTERN = new RegExp(
  `${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`,
  'g',
)

function ansiForeground(color: string): string {
  const match = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(color)
  if (!match) {
    throw new Error(`Expected rgb color, got ${color}`)
  }

  return `\u001B[38;2;${match[1]};${match[2]};${match[3]}m`
}

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

function includesInverseText(output: string, text: string): boolean {
  let searchFrom = 0
  while (searchFrom < output.length) {
    const inverseIndex = output.indexOf('\x1B[7m', searchFrom)
    if (inverseIndex === -1) {
      return false
    }

    const textIndex = output.indexOf(text, inverseIndex + 4)
    if (textIndex !== -1) {
      const nextResetIndex = output.indexOf('\x1B[27m', inverseIndex + 4)
      if (nextResetIndex === -1 || textIndex < nextResetIndex) {
        return true
      }
    }
    searchFrom = inverseIndex + 4
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

function createRenderStreams(): {
  outputRef: { value: string }
  stdout: PassThrough
  stdin: NodeJS.ReadStream
} {
  const outputRef = { value: '' }
  const stdout = new PassThrough()
  ;(stdout as unknown as { columns: number; rows: number }).columns = 80
  ;(stdout as unknown as { columns: number; rows: number }).rows = 10
  stdout.on('data', chunk => {
    outputRef.value += chunk.toString()
  })

  return {
    outputRef,
    stdout,
    stdin: createTestStdin(),
  }
}

describe('SettingsListRow', () => {
  it('recolors the label and value when keyboard focus moves to the row', async () => {
    const previousChalkLevel = chalk.level
    chalk.level = 3

    try {
      const [{ render, useApp }, { ThemeProvider }, { SettingsListRow }] =
        await Promise.all([
          import('../../ink.js'),
          import('../design-system/ThemeProvider.js'),
          import('./Config.js'),
        ])
      const setting = {
        id: 'showTips',
        label: 'Show tips',
        type: 'boolean' as const,
        value: true,
        onChange: () => {},
      }
      const Row = ({
        exitAfterRender = false,
        isSelected,
      }: {
        exitAfterRender?: boolean
        isSelected: boolean
      }): React.ReactNode => {
        const { exit } = useApp()
        React.useEffect(() => {
          if (!exitAfterRender) {
            return
          }
          const timer = setTimeout(exit, 20)
          return () => clearTimeout(timer)
        }, [exit, exitAfterRender])

        return (
          <ThemeProvider initialState="dark" onThemeSave={() => {}}>
            <SettingsListRow
              setting={setting}
              isSelected={isSelected}
              showThinkingWarning={false}
              autoUpdaterDisabledReason={null}
            />
          </ThemeProvider>
        )
      }

      const { outputRef, stdout, stdin } = createRenderStreams()
      const instance = await render(<Row isSelected={false} />, {
        stdout: stdout as unknown as NodeJS.WriteStream,
        stdin,
        patchConsole: false,
      })

      await new Promise(resolve => setTimeout(resolve, 20))
      instance.rerender(<Row isSelected={true} exitAfterRender />)
      await instance.waitUntilExit()

      const selectedFrame =
        extractFrames(outputRef.value)
          .slice()
          .reverse()
          .find(frame =>
            strippedAnsi(frame).includes(`${figures.pointer} Show tips`),
          ) ?? ''
      const suggestionColor = ansiForeground(getTheme('dark').suggestion)

      expect(selectedFrame).not.toBe('')
      expect(includesAnsiText(selectedFrame, suggestionColor, 'Show tips')).toBe(
        true,
      )
      expect(includesAnsiText(selectedFrame, suggestionColor, 'true')).toBe(true)
      expect(
        includesStyledPointerForText(selectedFrame, suggestionColor, 'Show tips'),
      ).toBe(true)
      expect(outputRef.value).not.toContain('\x00')
    } finally {
      chalk.level = previousChalkLevel
    }
  })
})

describe('Tabs', () => {
  it('repaints the selected tab label when the active tab changes', async () => {
    const previousChalkLevel = chalk.level
    chalk.level = 3

    try {
      const [{ render, useApp, Text }, { Tabs, Tab }] = await Promise.all([
        import('../../ink.js'),
        import('../design-system/Tabs.js'),
      ])

      const Harness = ({
        exitAfterRender = false,
        selectedTab,
      }: {
        exitAfterRender?: boolean
        selectedTab: string
      }): React.ReactNode => {
        const { exit } = useApp()
        React.useEffect(() => {
          if (!exitAfterRender) {
            return
          }
          const timer = setTimeout(exit, 20)
          return () => clearTimeout(timer)
        }, [exit, exitAfterRender])

        return (
          <Tabs
            selectedTab={selectedTab}
            onTabChange={() => {}}
            initialHeaderFocused={false}
          >
            <Tab title="Config">
              <Text>Config panel</Text>
            </Tab>
            <Tab title="Usage">
              <Text>Usage panel</Text>
            </Tab>
          </Tabs>
        )
      }

      const { outputRef, stdout, stdin } = createRenderStreams()
      const instance = await render(<Harness selectedTab="Config" />, {
        stdout: stdout as unknown as NodeJS.WriteStream,
        stdin,
        patchConsole: false,
      })

      await new Promise(resolve => setTimeout(resolve, 20))
      instance.rerender(
        <Harness selectedTab="Usage" exitAfterRender={true} />,
      )
      await instance.waitUntilExit()

      const usageFrame =
        extractFrames(outputRef.value)
          .slice()
          .reverse()
          .find(frame => strippedAnsi(frame).includes('Usage panel')) ?? ''

      expect(usageFrame).not.toBe('')
      expect(includesInverseText(usageFrame, 'Usage')).toBe(true)
      expect(includesInverseText(usageFrame, 'Config')).toBe(false)
      expect(outputRef.value).not.toContain('\x00')
    } finally {
      chalk.level = previousChalkLevel
    }
  })

  it('keeps the tab row focused after content arrow navigation', async () => {
    const previousChalkLevel = chalk.level
    chalk.level = 3

    try {
      const [
        { render, useApp, Text },
        { KeybindingProvider },
        { Tabs, Tab, useTabHeaderFocus },
      ] = await Promise.all([
        import('../../ink.js'),
        import('../../keybindings/KeybindingContext.js'),
        import('../design-system/Tabs.js'),
      ])

      const ConfigPanel = (): React.ReactNode => {
        useTabHeaderFocus()
        return <Text>Config panel</Text>
      }
      const Harness = (): React.ReactNode => {
        const { exit } = useApp()
        React.useEffect(() => {
          const timer = setTimeout(exit, 220)
          return () => clearTimeout(timer)
        }, [exit])

        return (
          <TestKeybindingProvider KeybindingProvider={KeybindingProvider}>
            <Tabs
              defaultTab="Config"
              initialHeaderFocused={false}
              navFromContent={true}
            >
              <Tab title="Config">
                <ConfigPanel />
              </Tab>
              <Tab title="Usage">
                <Text>Usage panel</Text>
              </Tab>
            </Tabs>
          </TestKeybindingProvider>
        )
      }

      const { outputRef, stdout, stdin } = createRenderStreams()
      const instance = await render(<Harness />, {
        stdout: stdout as unknown as NodeJS.WriteStream,
        stdin,
        patchConsole: false,
      })

      await new Promise(resolve => setTimeout(resolve, 30))
      ;(stdin as unknown as PassThrough).write('\x1B[C')
      await new Promise(resolve => setTimeout(resolve, 60))
      ;(stdin as unknown as PassThrough).write('\x1B[D')
      await instance.waitUntilExit()

      const frames = extractFrames(outputRef.value)
      const usageIndex = frames.findIndex(frame =>
        strippedAnsi(frame).includes('Usage panel'),
      )
      const usageFrame = usageIndex === -1 ? '' : frames[usageIndex]!
      const configFrameAfterUsage =
        usageIndex === -1
          ? ''
          : (frames
              .slice(usageIndex + 1)
              .find(frame => strippedAnsi(frame).includes('Config panel')) ??
            '')

      expect(usageFrame).not.toBe('')
      expect(includesInverseText(usageFrame, 'Usage')).toBe(true)
      expect(configFrameAfterUsage).not.toBe('')
      expect(includesInverseText(configFrameAfterUsage, 'Config')).toBe(true)
      expect(outputRef.value).not.toContain('\x00')
    } finally {
      chalk.level = previousChalkLevel
    }
  })
})
