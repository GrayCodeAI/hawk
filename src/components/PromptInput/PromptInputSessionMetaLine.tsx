import { homedir } from 'os'
import * as React from 'react'
import { useEffect, useState } from 'react'
import { getTotalDuration } from '../../bootstrap/state.js'
import {
  getTotalCacheCreationInputTokens,
  getTotalCacheReadInputTokens,
  getTotalCost,
  getTotalInputTokens,
  getTotalOutputTokens,
} from '../../cost-tracker.js'
import { Box, Text } from '../../ink.js'
import { getBranch } from '../../utils/git.js'

function getDisplayCwd(): string {
  const cwd = process.cwd()
  const home = homedir()
  if (cwd === home) return '~'
  if (cwd.startsWith(home + '/')) {
    return `~${cwd.slice(home.length)}`
  }
  return cwd
}

export function PromptInputSessionMetaLine(): React.ReactNode {
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

  // Format context size with full number (e.g., "12,943")
  const roundedContextTotal = Math.max(0, Math.round(contextTokenTotal))
  const contextValueLabel = roundedContextTotal.toLocaleString()

  // Simple display: just show total tokens
  const tokenLabel = `${contextValueLabel} tokens`
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
  const separatorColor = '#6b7280'
  const pathColor = '#61afef'
  const branchColor = '#ff9e64'
  const tokenColor = '#98c379'
  const costColor = '#e06c75'
  const durationColor = '#56b6c2'
  const versionColor = '#c678dd'

  return (
    <Box height={1} overflow="hidden" width="100%" justifyContent="flex-end">
      <Box flexShrink={1} minWidth={0}>
        <Text wrap="truncate">
          <Text color={pathColor}>▢ {displayPath}</Text>
          <Text color={separatorColor}>:</Text>
          <Text color={branchColor}>⎇ {branchLabel}</Text>
          <Text color={separatorColor}> · </Text>
        </Text>
      </Box>
      <Text>
        <Text color={tokenColor}>◉ {tokenLabel}</Text>
        <Text color={separatorColor}> · </Text>
        <Text color={costColor}>{costLabel}</Text>
        <Text color={separatorColor}> · </Text>
        <Text color={durationColor}>{durationLabel}</Text>
        <Text color={separatorColor}> · </Text>
        <Text color={versionColor}>⌖ {version}</Text>
      </Text>
    </Box>
  )
}
