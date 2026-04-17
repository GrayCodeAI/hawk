import { homedir } from 'os'
import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { getTotalDuration, getSdkBetas } from '../../bootstrap/state.js'
import {
  getTotalCacheCreationInputTokens,
  getTotalCacheReadInputTokens,
  getTotalCost,
  getTotalInputTokens,
  getTotalOutputTokens,
} from '../../cost-tracker.js'
import { useMainLoopModel } from '../../hooks/useMainLoopModel.js'
import { Box, Text } from '../../ink.js'
import type { Message } from '../../types/message.js'
import {
  calculateContextPercentages,
  getContextWindowForModel,
} from '../../utils/context.js'
import { formatTokens } from '../../utils/format.js'
import { getBranch } from '../../utils/git.js'
import { getRuntimeMainLoopModel } from '../../utils/model/model.js'
import type { PermissionMode } from '../../utils/permissions/PermissionMode.js'
import {
  doesMostRecentAssistantMessageExceed200k,
  getCurrentUsage,
} from '../../utils/tokens.js'

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
  const [displayPath] = useState(() => getDisplayCwd())
  const [branchLabel, setBranchLabel] = useState<string>('—')
  const mainLoopModel = useMainLoopModel()

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
  const runtimeMainLoopModel = useMemo(
    () =>
      getRuntimeMainLoopModel({
        permissionMode,
        mainLoopModel,
        exceeds200kTokens: doesMostRecentAssistantMessageExceed200k(messages),
      }),
    [permissionMode, mainLoopModel, messages],
  )
  const currentUsage = useMemo(() => getCurrentUsage(messages), [messages])
  const contextWindowSize = useMemo(
    () => getContextWindowForModel(runtimeMainLoopModel, getSdkBetas()),
    [runtimeMainLoopModel],
  )
  const currentContextTokens =
    currentUsage === null
      ? 0
      : currentUsage.input_tokens +
        currentUsage.cache_creation_input_tokens +
        currentUsage.cache_read_input_tokens
  const currentContextLabel = formatTokens(currentContextTokens).replace(
    /m$/,
    'M',
  )
  const contextWindowLabel = formatTokens(contextWindowSize).replace(/m$/, 'M')
  const contextUsage = calculateContextPercentages(
    currentUsage
      ? {
          input_tokens: currentUsage.input_tokens,
          cache_creation_input_tokens:
            currentUsage.cache_creation_input_tokens,
          cache_read_input_tokens: currentUsage.cache_read_input_tokens,
        }
      : null,
    contextWindowSize,
  )
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
  const branchColor = '#e5c07b'
  const tokenColor = '#98c379'
  const contextIconColor = '#56b6c2'
  const currentContextColor = '#f0f6fc'
  const totalContextColor = '#c678dd'
  const contextPercentColor = '#ff7a90'
  const costColor = '#d19a66'
  const durationColor = '#7dcfff'
  const versionColor = '#bb9af7'

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
        <Text color={contextIconColor}>◔ </Text>
        <Text color={currentContextColor}>{currentContextLabel}</Text>
        <Text color={separatorColor}> / </Text>
        <Text color={totalContextColor}>{contextWindowLabel}</Text>
        <Text color={separatorColor}> ctx</Text>
        {contextUsage.used === null ? null : (
          <>
            <Text color={separatorColor}> (</Text>
            <Text color={contextPercentColor}>{contextUsage.used}%</Text>
            <Text color={separatorColor}>)</Text>
          </>
        )}
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
