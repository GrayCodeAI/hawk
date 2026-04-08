/**
 * Assistant module stub
 *
 * This module is only available in special internal builds (feature flag: KAIROS).
 * In the open build, this stub provides minimal type support.
 */

/**
 * Check if running in assistant mode
 * Always returns false in open builds (KAIROS feature is disabled)
 */
export function isAssistantMode(): boolean {
  return false
}

export type BridgeWorkerType = 'hawk_code' | 'hawk_code_assistant'
