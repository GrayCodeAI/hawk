import { Box, Text } from '../ink/index.js'
import { getSmartRouter } from '../services/api/smartRouter.js'
import type { CommandMetadata } from '../types/command.js'

export const metadata: CommandMetadata = {
  name: 'provider-status',
  description: 'Show health and performance metrics for all configured providers',
  category: 'diagnostics',
}

export async function call(): Promise<void> {
  const router = getSmartRouter()
  await router.initialize()
  
  const status = router.getStatus()
  
  console.log('\n📊 Provider Status\n')
  console.log('─'.repeat(80))
  
  for (const provider of status) {
    const healthIcon = provider.healthy ? '✓' : '✗'
    const healthColor = provider.healthy ? '\x1b[32m' : '\x1b[31m'
    const configIcon = provider.configured ? '🔑' : '⚠️'
    
    console.log(
      `${healthColor}${healthIcon}\x1b[0m ${configIcon} ${provider.name.padEnd(15)} ` +
      `${provider.avgLatencyMs.toFixed(0).padStart(5)}ms | ` +
      `$${provider.costPer1kTokens.toFixed(4)}/1k | ` +
      `${provider.requestCount} reqs | ` +
      `${provider.errorCount} errors` +
      (provider.requestCount > 0 
        ? ` (${((provider.errorCount / provider.requestCount) * 100).toFixed(1)}%)` 
        : '')
    )
  }
  
  console.log('─'.repeat(80))
  
  const healthy = status.filter(p => p.healthy && p.configured)
  console.log(`\n✓ ${healthy.length} healthy provider(s) available`)
  
  const strategy = process.env.ROUTER_STRATEGY || 'balanced'
  console.log(`📍 Routing strategy: ${strategy}`)
  console.log()
}

export function ProviderStatus() {
  return (
    <Box flexDirection="column">
      <Text>Loading provider status...</Text>
    </Box>
  )
}
