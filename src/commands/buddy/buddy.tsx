import React from 'react'
import { Box, Text } from '../../ink.js'
import type { LocalJSXCommandOnDone } from '../../types/command.js'
import type { ProcessUserInputContext } from '../../utils/processUserInput/processUserInput.js'
import { getCompanion } from '../../buddy/companion.js'
import { RARITY_STARS, RARITY_COLORS } from '../../buddy/types.js'
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'

// @ts-ignore - defined by build script
declare const __BUDDY_ENABLED__: boolean

function BuddyDisplay() {
  if (!__BUDDY_ENABLED__) {
    return <Text color="error">Buddy is not enabled in this build.</Text>
  }

  const companion = getCompanion()
  if (!companion) {
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>No companion hatched yet.</Text>
        <Text dimColor>Start a conversation to hatch your companion!</Text>
      </Box>
    )
  }

  const rarityStar = RARITY_STARS[companion.rarity]
  const rarityColor = RARITY_COLORS[companion.rarity]
  const muted = getGlobalConfig().companionMuted ?? false

  const stats = Object.entries(companion.stats)
    .map(([name, value]) => `${name}: ${value}`)
    .join('  ')

  return (
    <Box flexDirection="column" gap={1}>
      <Box>
        <Text color={rarityColor}>
          {companion.name}
        </Text>
        <Text> {rarityStar}</Text>
        <Text dimColor> ({companion.rarity})</Text>
      </Box>
      <Text dimColor>Species: {companion.species} · Eye: {companion.eye} · Hat: {companion.hat}</Text>
      <Text dimColor>{stats}</Text>
      <Box>
        <Text dimColor>Muted: </Text>
        <Text color={muted ? 'error' : 'success'}>{muted ? 'Yes' : 'No'}</Text>
      </Box>
      <Text dimColor>
        Use /buddy mute or /buddy unmute to toggle companion visibility.
      </Text>
    </Box>
  )
}

export async function call(
  onDone: LocalJSXCommandOnDone,
  _context: ProcessUserInputContext,
  args: string,
): Promise<React.ReactNode> {
  const subcommand = args?.trim().toLowerCase()

  if (subcommand === 'mute') {
    saveGlobalConfig(cfg => ({ ...cfg, companionMuted: true }))
    onDone('Companion muted.')
    return null
  }

  if (subcommand === 'unmute') {
    saveGlobalConfig(cfg => ({ ...cfg, companionMuted: false }))
    onDone('Companion unmuted.')
    return null
  }

  // Show buddy status
  return <BuddyDisplay />
}
