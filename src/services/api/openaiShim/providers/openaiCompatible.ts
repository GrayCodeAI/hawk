export function applyOpenAICompatibleHeaders(
  headers: Record<string, string>,
  apiKey: string,
): void {
  headers.Authorization = `Bearer ${apiKey}`
}
