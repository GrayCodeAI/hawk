import { useEffect, useState } from 'react'
import {
  type HawkAILimits,
  currentHawkLimits,
  statusListeners,
} from './hawkAiLimits.js'

export function useHawkAiLimits(): HawkAILimits {
  const [limits, setLimits] = useState<HawkAILimits>({ ...currentHawkLimits })

  useEffect(() => {
    const listener = (newLimits: HawkAILimits) => {
      setLimits({ ...newLimits })
    }
    statusListeners.add(listener)

    return () => {
      statusListeners.delete(listener)
    }
  }, [])

  return limits
}
