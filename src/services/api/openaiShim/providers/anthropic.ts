export function applyAnthropicHeaders(
  headers: Record<string, string>,
  apiKey: string,
  anthropicVersion?: string,
): void {
  headers.Authorization = `Bearer ${apiKey}`
  headers['x-api-key'] = apiKey
  headers['anthropic-version'] = anthropicVersion?.trim() || '2023-06-01'
}
