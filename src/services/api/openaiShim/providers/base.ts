export function createBaseHeaders(
  defaultHeaders: Record<string, string>,
  requestHeaders?: Record<string, string>,
): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...defaultHeaders,
    ...(requestHeaders ?? {}),
  }
}

export function buildChatCompletionsUrl(baseUrl: string): string {
  return `${baseUrl}/chat/completions`
}
