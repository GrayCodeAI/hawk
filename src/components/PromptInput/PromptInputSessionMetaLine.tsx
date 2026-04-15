import { homedir } from 'os'
import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  getTotalCacheCreationInputTokens,
  getTotalCacheReadInputTokens,
  getTotalCost,
  getTotalInputTokens,
  getTotalOutputTokens,
  getTurnTotalTokens,
} from '../../cost-tracker.js'
import { getTotalDuration } from '../../bootstrap/state.js'
import { Box, Text } from '../../ink.js'
import type { Message } from '../../types/message.js'
import { getBranch } from '../../utils/git.js'
import { modelDisplayString } from '../../utils/model/model.js'
import { getAPIProvider } from '../../utils/model/providers.js'
import {
  isDefaultMode,
  permissionModeTitle,
  type PermissionMode,
} from '../../utils/permissions/PermissionMode.js'
import { useAppState } from '../../state/AppState.js'

type Props = {
  permissionMode: PermissionMode
  messages: Message[]
}

function getDisplayCwd(): string {
  const cwd = process.cwd()
  const home = homedir()
  if (cwd === home) return '~'
  if (cwd.startsWith(home + '/')) {
    return `~${cwd.slice(home.length)}`
  }
  return cwd
}

export function PromptInputSessionMetaLine({
  permissionMode,
  messages,
}: Props): React.ReactNode {
  const mainLoopModel = useAppState(s => s.mainLoopModel)
  const [displayPath] = useState(() => getDisplayCwd())
  const [branchLabel, setBranchLabel] = useState<string>('—')

  useEffect(() => {
    let cancelled = false

    const refreshGitLabels = async () => {
      const branch = await getBranch().catch(() => '')
      if (cancelled) return
      setBranchLabel(branch || '—')
    }

    void refreshGitLabels()
    const timer = setInterval(() => {
      void refreshGitLabels()
    }, 15_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  // Calculate tokens directly every render
  const contextTokenTotal =
    getTotalInputTokens() +
    getTotalOutputTokens() +
    getTotalCacheReadInputTokens() +
    getTotalCacheCreationInputTokens()
  const turnTokenDelta = getTurnTotalTokens()
  const hasAssistantMessages = messages.some(m => m.type === 'assistant')
  const hasAPIUsage = contextTokenTotal > 0
  
  // Format context size with full number (e.g., "12,943")
  const roundedContextTotal = Math.max(0, Math.round(contextTokenTotal))
  const contextValueLabel = roundedContextTotal.toLocaleString()
  
  // Simple display: just show total tokens
  const tokenLabel = `${contextValueLabel} tokens`
  // Always bright green
  const tokenColor = 'ansi:greenBright'
  const modeLabel = isDefaultMode(permissionMode)
    ? 'default'
    : permissionModeTitle(permissionMode).toLowerCase()
  const provider = getAPIProvider()
  const modelLabel = `${provider}: ${modelDisplayString(mainLoopModel)}`
  const totalCost = getTotalCost()
  const costLabel =
    totalCost === 0
      ? '$0.00'
      : totalCost < 0.01
        ? `$${totalCost.toFixed(4)}`
        : `$${totalCost.toFixed(2)}`
  const version = `v${MACRO.DISPLAY_VERSION ?? MACRO.VERSION}`
  
  // Format session duration ⏱ 28m 22s
  const durationMs = getTotalDuration()
  const durationSec = Math.floor(durationMs / 1000)
  const durationMin = Math.floor(durationSec / 60)
  const durationHour = Math.floor(durationMin / 60)
  const durationLabel = durationHour > 0
    ? `⏱ ${durationHour}h ${durationMin % 60}m ${durationSec % 60}s`
    : durationMin > 0
      ? `⏱ ${durationMin}m ${durationSec % 60}s`
      : `⏱ ${durationSec}s`

  // Unique bright color scheme for each footer element
  const dimGray = 'ansi:blackBright'
  const modeColor = 'ansi:redBright'
  const modelColor = '#DA70D6'
  const pathColor = 'ansi:blueBright'
  const branchColor = 'ansi:yellowBright'
  const costColor = 'ansi:magentaBright'
  const durationColor = 'ansi:cyanBright'
  const versionColor = 'ansi:whiteBright'

  return (
    <Box height={1} overflow="hidden" width="100%" justifyContent="flex-end">
      <Box flexShrink={1} minWidth={0}>
        <Text wrap="truncate">
          <Text color={modeColor}>◆ {modeLabel}</Text>
          <Text color={dimGray}>  </Text>
          <Text color={modelColor}>◇ {modelLabel}</Text>
          <Text color={dimGray}>  </Text>
          <Text color={pathColor}>▢ {displayPath}</Text>
          <Text color={dimGray}>:</Text>
          <Text color={branchColor}>⎇ {branchLabel}</Text>
          <Text color={dimGray}>  </Text>
        </Text>
      </Box>
      <Text>
        <Text color={tokenColor}>◉ {tokenLabel}</Text>
        <Text color={dimGray}>  </Text>
        <Text color={costColor}>{costLabel}</Text>
        <Text color={dimGray}>  </Text>
        <Text color={durationColor}>{durationLabel}</Text>
        <Text color={dimGray}>  </Text>
        <Text color={versionColor}>⌖ {version}</Text>
      </Text>
    </Box>
  )
}
