import { homedir } from 'os'
import * as React from 'react'
import { useEffect, useState } from 'react'
import {
  getTotalCacheCreationInputTokens,
  getTotalCacheReadInputTokens,
  getTotalCost,
  getTotalInputTokens,
  getTotalOutputTokens,
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

  const apiTokenTotal =
    getTotalInputTokens() +
    getTotalOutputTokens() +
    getTotalCacheReadInputTokens() +
    getTotalCacheCreationInputTokens()
  const hasAssistantMessages = messages.some(m => m.type === 'assistant')
  const hasAPIUsage = apiTokenTotal > 0
  const roundedTokenTotal = Math.max(0, Math.round(apiTokenTotal))
  const tokenValueLabel =
    hasAPIUsage && roundedTokenTotal >= 10_000
      ? `${(roundedTokenTotal / 1_000).toFixed(1)}k`
      : roundedTokenTotal.toLocaleString()
  const tokenLabel = `${tokenValueLabel} tokens`
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
