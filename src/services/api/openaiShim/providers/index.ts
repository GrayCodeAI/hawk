import { applyAnthropicHeaders } from './anthropic.js'
import { createBaseHeaders, buildChatCompletionsUrl } from './base.js'
import { applyOpenAICompatibleHeaders } from './openaiCompatible.js'
import type { OpenAIShimRuntime } from './types.js'

export function buildRuntimeRequest(
  runtime: OpenAIShimRuntime,
  defaultHeaders: Record<string, string>,
  requestHeaders?: Record<string, string>,
): {
  url: string
  headers: Record<string, string>
} {
  const headers = createBaseHeaders(defaultHeaders, requestHeaders)
  const apiKey = runtime.apiKey

  if (apiKey) {
    if (runtime.mode === 'anthropic') {
      applyAnthropicHeaders(headers, apiKey, process.env.ANTHROPIC_VERSION)
    } else {
      applyOpenAICompatibleHeaders(headers, apiKey)
    }
  } else if (runtime.mode === 'anthropic') {
    headers['anthropic-version'] = process.env.ANTHROPIC_VERSION?.trim() || '2023-06-01'
  }

  return {
    url: buildChatCompletionsUrl(runtime.request.baseUrl),
    headers,
  }
}
