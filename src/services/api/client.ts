import Anthropic from '@anthropic-ai/sdk'
import {
  createAnthropicClient,
  detectProvider,
  parseCustomHeaders,
} from '@hawk/eyrie'
import { randomUUID } from 'crypto'
import { getUserAgent } from 'src/utils/http.js'
import { getSessionId } from '../../bootstrap/state.js'
import { isEnvTruthy } from '../../utils/envUtils.js'
import { logForDebugging } from '../../utils/debug.js'

export const CLIENT_REQUEST_ID_HEADER = 'x-client-request-id'

function buildFetch(
  fetchOverride: typeof globalThis.fetch | undefined,
  source: string | undefined,
): typeof globalThis.fetch {
  // eslint-disable-next-line eslint-plugin-n/no-unsupported-features/node-builtins
  const inner = fetchOverride ?? globalThis.fetch
  return (input, init) => {
    // eslint-disable-next-line eslint-plugin-n/no-unsupported-features/node-builtins
    const headers = new Headers(init?.headers)
    if (!headers.has(CLIENT_REQUEST_ID_HEADER)) {
      headers.set(CLIENT_REQUEST_ID_HEADER, randomUUID())
    }
    try {
      // eslint-disable-next-line eslint-plugin-n/no-unsupported-features/node-builtins
      const url = input instanceof Request ? input.url : String(input)
      const id = headers.get(CLIENT_REQUEST_ID_HEADER)
      logForDebugging(
        `[API REQUEST] ${new URL(url).pathname}${id ? ` ${CLIENT_REQUEST_ID_HEADER}=${id}` : ''} source=${source ?? 'unknown'}`,
      )
    } catch {
      // never let logging crash the fetch
    }
    return inner(input, { ...init, headers })
  }
}

/**
 * Returns a configured LLM inference client via eyrie.
 *
 * Provider is chosen by which env var is set (first match wins):
 *   ANTHROPIC_API_KEY              → Anthropic SDK
 *   GROK_API_KEY / XAI_API_KEY     → OpenAI shim (xAI)
 *   GEMINI_API_KEY                 → OpenAI shim (Google)
 *   OPENROUTER_API_KEY             → OpenAI shim (OpenRouter)
 *   OPENAI_API_KEY                 → OpenAI shim
 *   OLLAMA_BASE_URL                → OpenAI shim (local)
 */
export async function getLLMClient({
  apiKey,
  maxRetries,
  model,
  fetchOverride,
  source,
}: {
  apiKey?: string
  maxRetries: number
  model?: string
  fetchOverride?: typeof globalThis.fetch
  source?: string
}): Promise<Anthropic> {
  const provider = detectProvider()

  // OpenAI-compatible providers go through hawk's existing shim
  if (provider !== 'anthropic') {
    const { createOpenAIShimClient } = await import('./openaiShim.js')
    return createOpenAIShimClient({
      maxRetries,
      timeout: parseInt(process.env.API_TIMEOUT_MS || String(600 * 1000), 10),
    }) as unknown as Anthropic
  }

  const containerId = process.env.HAWK_CODE_CONTAINER_ID
  const remoteSessionId = process.env.HAWK_CODE_REMOTE_SESSION_ID
  const clientApp = process.env.HAWK_AGENT_SDK_CLIENT_APP
  const customHeaders = parseCustomHeaders()

  const defaultHeaders: Record<string, string> = {
    'x-app': 'cli',
    'User-Agent': getUserAgent(),
    'X-Hawk-Code-Session-Id': getSessionId(),
    ...customHeaders,
    ...(containerId ? { 'x-hawk-remote-container-id': containerId } : {}),
    ...(remoteSessionId ? { 'x-hawk-remote-session-id': remoteSessionId } : {}),
    ...(clientApp ? { 'x-client-app': clientApp } : {}),
    ...(isEnvTruthy(process.env.HAWK_CODE_ADDITIONAL_PROTECTION)
      ? { 'x-hawk-additional-protection': 'true' }
      : {}),
  }

  logForDebugging(`[API] Creating Anthropic client via eyrie`)

  return createAnthropicClient({
    apiKey,
    defaultHeaders,
    maxRetries,
    timeout: parseInt(process.env.API_TIMEOUT_MS || String(600 * 1000), 10),
    fetch: buildFetch(fetchOverride, source),
  })
}
