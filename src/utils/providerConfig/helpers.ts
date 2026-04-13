export function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function normalizeOllamaOpenAIBaseUrl(baseUrl: string | undefined): string | undefined {
  if (!baseUrl) return undefined
  const trimmed = baseUrl.replace(/\/+$/, '')
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`
}

export function setEnvValue(
  env: NodeJS.ProcessEnv,
  key: string,
  value: string | undefined,
  overwrite: boolean,
): void {
  if (!value) return
  if (!overwrite && env[key]) return
  env[key] = value
}
