/**
 * Keep GrayCode and GrayCode env var namespaces interoperable.
 *
 * This lets users migrate to GRAYCODE_* names while preserving compatibility
 * with existing code paths and external contracts that still read ANTHROPIC_*.
 */
export function applyGrayCodeEnvCompat(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const entries = Object.entries(env)

  for (const [key, value] of entries) {
    if (value == null) continue

    if (key.startsWith('GRAYCODE_')) {
      const suffix = key.slice('GRAYCODE_'.length)
      if (!suffix) continue
      const anthropicKey = `ANTHROPIC_${suffix}`
      if (env[anthropicKey] == null) {
        env[anthropicKey] = value
      }
      continue
    }

    if (key.startsWith('ANTHROPIC_')) {
      const suffix = key.slice('ANTHROPIC_'.length)
      if (!suffix) continue
      const grayCodeKey = `GRAYCODE_${suffix}`
      if (env[grayCodeKey] == null) {
        env[grayCodeKey] = value
      }
    }
  }
}
