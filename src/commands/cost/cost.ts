import { formatTotalCost } from '../../cost-tracker.js'
import { currentHawkLimits } from '../../services/hawkAiLimits.js'
import type { LocalCommandCall } from '../../types/command.js'
import { isHawkAISubscriber } from '../../utils/auth.js'

export const call: LocalCommandCall = async () => {
  if (isHawkAISubscriber()) {
    let value: string

    if (currentHawkLimits.isUsingOverage) {
      value =
        'You are currently using your overages to power your Hawk usage. We will automatically switch you back to your subscription rate limits when they reset'
    } else {
      value =
        'You are currently using your subscription to power your Hawk usage'
    }

    if (process.env.USER_TYPE === 'ant') {
      value += `\n\n[ANT-ONLY] Showing cost anyway:\n ${formatTotalCost()}`
    }
    return { type: 'text', value }
  }
  return { type: 'text', value: formatTotalCost() }
}
