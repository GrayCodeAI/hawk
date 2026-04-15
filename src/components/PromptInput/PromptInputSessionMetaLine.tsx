import { homedir } from 'os'
import * as React from 'react'
import { useEffect, useState } from 'react'
import {
  getTotalCacheCreationInputTokens,
  getTotalCacheReadInputTokens,
  getTotalCost,
  getTotalInputTokens,
  getTotalOutputTokens,
  getTurnTotalTokens,
} from '../../cost-tracker.js'
import { Box, Text } from '../../ink.js'
import type { Message } from '../../types/message.js'
import { getBranch } from '../../utils/git.js'
import { modelDisplayString } from '../../utils/model/model.js'
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

  // Show both total context and per-message delta
  const contextTokenTotal =
    getTotalInputTokens() +
    getTotalOutputTokens() +
    getTotalCacheReadInputTokens() +
    getTotalCacheCreationInputTokens()
  const turnTokenDelta = getTurnTotalTokens()
  const hasAssistantMessages = messages.some(m => m.type === 'assistant')
  const hasAPIUsage = contextTokenTotal > 0
  
  // Format context size (e.g., "12.9k")
  const roundedContextTotal = Math.max(0, Math.round(contextTokenTotal))
  const contextValueLabel =
    hasAPIUsage && roundedContextTotal >= 10_000
      ? `${(roundedContextTotal / 1_000).toFixed(1)}k`
      : roundedContextTotal.toLocaleString()
  
  // Format turn delta (e.g., "+50")
  const turnValueLabel = turnTokenDelta > 0 ? `+${turnTokenDelta.toLocaleString()}` : ''
  
  // Combined label: "12.9k context · +50" or just "12.9k context" for first message
  const tokenLabel = turnValueLabel 
    ? `${contextValueLabel}k context · ${turnValueLabel}`
    : `${contextValueLabel}k context`
  const tokenStatusColor = hasAPIUsage
    ? 'success'
    : hasAssistantMessages
      ? 'warning'
      : 'inactive'
  const modeLabel = isDefaultMode(permissionMode)
    ? 'default'
    : permissionModeTitle(permissionMode).toLowerCase()
  const modelLabel = modelDisplayString(mainLoopModel)
  const totalCost = getTotalCost()
  const costLabel =
    totalCost === 0
      ? '$0.00'
      : totalCost < 0.01
        ? `$${totalCost.toFixed(4)}`
        : `$${totalCost.toFixed(2)}`
  const version = `v${MACRO.DISPLAY_VERSION ?? MACRO.VERSION}`

  return (
    <Box height={1} overflow="hidden" width="100%" justifyContent="flex-end">
      <Box flexShrink={1} minWidth={0}>
        <Text wrap="truncate" dimColor>
          · {modeLabel} · {modelLabel} · {displayPath}:{branchLabel} ·{' '}
        </Text>
      </Box>
      <Text dimColor>
        <Text color={tokenStatusColor}>●</Text> {tokenLabel} · {costLabel} · {version}
      </Text>
    </Box>
  )
}
