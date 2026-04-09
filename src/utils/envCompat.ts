/**
 * Keep GrayCode and GrayCode env var namespaces interoperable.
 *
 * This lets users migrate to GRAYCODE_* names while preserving compatibility
 * with existing code paths and external contracts that still read GRAYCODE_*.
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
      const graycodeKey = `GRAYCODE_${suffix}`
      if (env[graycodeKey] == null) {
        env[graycodeKey] = value
      }
    }
  }
}
