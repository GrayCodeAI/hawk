/**
 * OpenAI-compatible API shim for Hawk.
 *
 * Translates GrayCode SDK calls (graycode.beta.messages.create) into
 * OpenAI-compatible chat completion requests and streams back events
 * in the GrayCode streaming format so the rest of the codebase is unaware.
 *
 * Supports: OpenAI, Azure OpenAI, Ollama, LM Studio, OpenRouter,
 * Grok/xAI, Together, Groq, Fireworks, DeepSeek, Mistral, and any
 * OpenAI-compatible API.
 *
 * Environment variables:
 *   OPENAI_API_KEY=sk-...             — API key (required to enable OpenAI provider)
 *   OPENAI_BASE_URL=http://...        — base URL (default: https://api.openai.com/v1)
 *   OPENAI_MODEL=gpt-4o              — default model override
 */

import {
  resolveOpenAICompatibleRuntime,
} from '@hawk/eyrie'
import { buildRuntimeRequest } from './openaiShim/providers/index.js'

// ---------------------------------------------------------------------------
// Types — minimal subset of GrayCode SDK types we need to produce
// ---------------------------------------------------------------------------

interface GrayCodeUsage {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
}

interface GrayCodeStreamEvent {
  type: string
  message?: Record<string, unknown>
  index?: number
  content_block?: Record<string, unknown>
  delta?: Record<string, unknown>
  usage?: Partial<GrayCodeUsage>
}

interface ShimCreateParams {
  model: string
  messages: Array<Record<string, unknown>>
  system?: unknown
  tools?: Array<Record<string, unknown>>
  max_tokens: number
  stream?: boolean
  temperature?: number
  top_p?: number
  tool_choice?: unknown
  metadata?: unknown
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Message format conversion: GrayCode → OpenAI
// ---------------------------------------------------------------------------

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
  tool_call_id?: string
  name?: string
  reasoning_content?: string  // For Kimi/OpenCodeGO
}

interface OpenAITool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
    strict?: boolean
  }
}

const OPENCODEGO_QUICK_VISION_MAX_TOKENS = 256
const QUICK_VISION_PROMPT_MAX_LENGTH = 220
const QUICK_VISION_PROMPT_MAX_WORDS = 28
const IMAGE_REF_REGEX = /\[Image #\d+\]/gi
const QUICK_VISION_START_REGEX =
  /^(?:explain|describe|summari[sz]e|caption|analy[sz]e|identify|extract|read|ocr|what(?:'s| is)|list|tell me)/i
const CONTEXT_HEAVY_KEYWORDS_REGEX =
  /\b(?:repo|repository|project|code|file|files|path|diff|commit|branch|build|test|debug|refactor|function|class|api|stacktrace|error|fix|implement)\b/i
const REQUESTED_WORD_LIMIT_REGEX = /\b(?:max\s+)?(\d{1,3})\s+words?\b/i

type OpenAITextPart = { type: 'text'; text?: string }
type OpenAIImagePart = { type: 'image_url'; image_url?: { url: string } }

function getLastUserImagePromptText(messages: OpenAIMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (!msg || msg.role !== 'user') {
      continue
    }

    if (!Array.isArray(msg.content)) {
      return null
    }

    const parts = msg.content as Array<OpenAITextPart | OpenAIImagePart>
    const hasImage = parts.some(part => part.type === 'image_url')
    if (!hasImage) {
      return null
    }

    const text = parts
      .filter((part): part is OpenAITextPart => part.type === 'text')
      .map(part => part.text ?? '')
      .join(' ')

    return text
  }

  return null
}

function getRequestedWordLimit(text: string): number | null {
  const match = text.match(REQUESTED_WORD_LIMIT_REGEX)
  if (!match) {
    return null
  }

  const parsed = Number.parseInt(match[1] ?? '', 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }

  return parsed
}

function getQuickVisionMaxTokens(promptText: string): number | null {
  const normalized = promptText
    .replace(IMAGE_REF_REGEX, '')
    .replace(/^[\s:;,\-–—|>]+/, '')
    .trim()

  if (normalized.length === 0) {
    return OPENCODEGO_QUICK_VISION_MAX_TOKENS
  }

  if (normalized.length > QUICK_VISION_PROMPT_MAX_LENGTH) {
    return null
  }

  const words = normalized.split(/\s+/).filter(Boolean)
  if (words.length > QUICK_VISION_PROMPT_MAX_WORDS) {
    return null
  }

  if (CONTEXT_HEAVY_KEYWORDS_REGEX.test(normalized)) {
    return null
  }

  if (!QUICK_VISION_START_REGEX.test(normalized)) {
    return null
  }

  const requestedWordLimit = getRequestedWordLimit(normalized)
  if (requestedWordLimit !== null) {
    return Math.max(48, Math.min(OPENCODEGO_QUICK_VISION_MAX_TOKENS, requestedWordLimit * 4))
  }

  return OPENCODEGO_QUICK_VISION_MAX_TOKENS
}

function getOpenCodeGOThinkingMode(
  params: ShimCreateParams,
): 'enabled' | 'disabled' {
  const override = process.env.HAWK_CODE_OPENCODEGO_THINKING
    ?.trim()
    .toLowerCase()

  if (override === 'enabled' || override === 'true' || override === '1') {
    return 'enabled'
  }
  if (override === 'disabled' || override === 'false' || override === '0') {
    return 'disabled'
  }

  const thinking = params.thinking as { type?: string } | undefined
  if (thinking && thinking.type && thinking.type !== 'disabled') {
    return 'enabled'
  }

  return 'disabled'
}

function convertSystemPrompt(
  system: unknown,
): string {
  if (!system) return ''
  if (typeof system === 'string') return system
  if (Array.isArray(system)) {
    return system
      .map((block: { type?: string; text?: string }) =>
        block.type === 'text' ? block.text ?? '' : '',
      )
      .join('\n\n')
  }
  return String(system)
}

function convertContentBlocks(
  content: unknown,
): string | Array<{ type: string; text?: string; image_url?: { url: string } }> {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return String(content ?? '')

  const parts: Array<{ type: string; text?: string; image_url?: { url: string } }> = []
  for (const block of content) {
    switch (block.type) {
      case 'text':
        parts.push({ type: 'text', text: block.text ?? '' })
        break
      case 'image': {
        const src = block.source
        if (src?.type === 'base64') {
          parts.push({
            type: 'image_url',
            image_url: {
              url: `data:${src.media_type};base64,${src.data}`,
            },
          })
        } else if (src?.type === 'url') {
          parts.push({ type: 'image_url', image_url: { url: src.url } })
        }
        break
      }
      case 'tool_use':
        // handled separately
        break
      case 'tool_result':
        // handled separately
        break
      case 'thinking':
        // Append thinking as text with a marker for models that support reasoning
        if (block.thinking) {
          parts.push({ type: 'text', text: `<thinking>${block.thinking}</thinking>` })
        }
        break
      default:
        if (block.text) {
          parts.push({ type: 'text', text: block.text })
        }
    }
  }

  if (parts.length === 0) return ''
  if (parts.length === 1 && parts[0].type === 'text') return parts[0].text ?? ''
  return parts
}

function convertMessages(
  messages: Array<{ role: string; message?: { role?: string; content?: unknown }; content?: unknown }>,
  system: unknown,
  isOpenCodeGO = false,
): OpenAIMessage[] {
  const result: OpenAIMessage[] = []

  // System message first
  const sysText = convertSystemPrompt(system)
  if (sysText) {
    result.push({ role: 'system', content: sysText })
  }

  for (const msg of messages) {
    // Hawk wraps messages in { role, message: { role, content } }
    const inner = msg.message ?? msg
    const role = (inner as { role?: string }).role ?? msg.role
    const content = (inner as { content?: unknown }).content

    if (role === 'user') {
      // Check for tool_result blocks in user messages
      if (Array.isArray(content)) {
        const toolResults = content.filter((b: { type?: string }) => b.type === 'tool_result')
        const otherContent = content.filter((b: { type?: string }) => b.type !== 'tool_result')

        // Emit tool results as tool messages
        for (const tr of toolResults) {
          const trContent = Array.isArray(tr.content)
            ? tr.content.map((c: { text?: string }) => c.text ?? '').join('\n')
            : typeof tr.content === 'string'
              ? tr.content
              : JSON.stringify(tr.content ?? '')
          result.push({
            role: 'tool',
            tool_call_id: tr.tool_use_id ?? 'unknown',
            content: tr.is_error ? `Error: ${trContent}` : trContent,
          })
        }

        // Emit remaining user content
        if (otherContent.length > 0) {
          result.push({
            role: 'user',
            content: convertContentBlocks(otherContent),
          })
        }
      } else {
        result.push({
          role: 'user',
          content: convertContentBlocks(content),
        })
      }
    } else if (role === 'assistant') {
      // Check for tool_use blocks
      if (Array.isArray(content)) {
        const toolUses = content.filter((b: { type?: string }) => b.type === 'tool_use')
        const thinkingBlocks = content.filter((b: { type?: string }) => b.type === 'thinking')
        const textContent = content.filter(
          (b: { type?: string }) => b.type !== 'tool_use' && b.type !== 'thinking',
        )

        const assistantMsg: OpenAIMessage & { reasoning_content?: string } = {
          role: 'assistant',
          content: convertContentBlocks(textContent) as string,
        }

        if (toolUses.length > 0) {
          assistantMsg.tool_calls = toolUses.map(
            (tu: { id?: string; name?: string; input?: unknown }) => ({
              id: tu.id ?? `call_${Math.random().toString(36).slice(2)}`,
              type: 'function' as const,
              function: {
                name: tu.name ?? 'unknown',
                arguments:
                  typeof tu.input === 'string'
                    ? tu.input
                    : JSON.stringify(tu.input ?? {}),
              },
            }),
          )
        }

        // For OpenCodeGO/Kimi: MUST include reasoning_content in ALL assistant messages
        // when thinking is enabled, including tool call messages. Empty string if no thinking.
        if (isOpenCodeGO) {
          assistantMsg.reasoning_content = thinkingBlocks
            .map((b: { thinking?: string }) => b.thinking ?? '')
            .join('') || ''
        }

        result.push(assistantMsg)
      } else {
        const assistantMsg: OpenAIMessage & { reasoning_content?: string } = {
          role: 'assistant',
          content: convertContentBlocks(content) as string,
        }
        // For OpenCodeGO/Kimi: no thinking blocks in scalar content, empty string is fine.
        if (isOpenCodeGO) {
          assistantMsg.reasoning_content = ''
        }
        result.push(assistantMsg)
      }
    }
  }

  return result
}

function convertTools(
  tools: Array<{ name: string; description?: string; input_schema?: Record<string, unknown> }>,
): OpenAITool[] {
  return tools
    .filter(t => t.name !== 'ToolSearchTool') // Not relevant for OpenAI
    .map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description ?? '',
        parameters: t.input_schema ?? { type: 'object', properties: {} },
      },
    }))
}

// ---------------------------------------------------------------------------
// Streaming: OpenAI SSE → GrayCode stream events
// ---------------------------------------------------------------------------

interface OpenAIStreamChunk {
  id: string
  object: string
  model: string
  choices: Array<{
    index: number
    delta: {
      role?: string
      content?: string | null
      reasoning_content?: string | null  // Kimi's thinking content
      tool_calls?: Array<{
        index: number
        id?: string
        type?: string
        function?: { name?: string; arguments?: string }
      }>
    }
    finish_reason: string | null
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

function makeMessageId(): string {
  return `msg_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

function convertChunkUsage(
  usage: OpenAIStreamChunk['usage'] | undefined,
): Partial<GrayCodeUsage> | undefined {
  if (!usage) return undefined

  return {
    input_tokens: usage.prompt_tokens ?? 0,
    output_tokens: usage.completion_tokens ?? 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  }
}

/**
 * Async generator that transforms an OpenAI SSE stream into
 * GrayCode-format BetaRawMessageStreamEvent objects.
 */
async function* openaiStreamToGrayCode(
  response: Response,
  model: string,
): AsyncGenerator<GrayCodeStreamEvent> {
  const messageId = makeMessageId()
  let contentBlockIndex = 0
  const activeToolCalls = new Map<number, { id: string; name: string; index: number }>()
  let hasEmittedContentStart = false
  let lastStopReason: 'tool_use' | 'max_tokens' | 'end_turn' | null = null
  let hasEmittedFinalUsage = false
  let hasProcessedFinishReason = false

  // Emit message_start
  yield {
    type: 'message_start',
    message: {
      id: messageId,
      type: 'message',
      role: 'assistant',
      content: [],
      model,
      stop_reason: null,
      stop_sequence: null,
      usage: {
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
    },
  }

  const reader = response.body?.getReader()
  if (!reader) return

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed === 'data: [DONE]') continue
      if (!trimmed.startsWith('data: ')) continue

      let chunk: OpenAIStreamChunk
      try {
        chunk = JSON.parse(trimmed.slice(6))
      } catch {
        continue
      }

      const chunkUsage = convertChunkUsage(chunk.usage)

      for (const choice of chunk.choices ?? []) {
        const delta = choice.delta

        // Text content
        if (delta.content) {
          if (!hasEmittedContentStart) {
            yield {
              type: 'content_block_start',
              index: contentBlockIndex,
              content_block: { type: 'text', text: '' },
            }
            hasEmittedContentStart = true
          }
          yield {
            type: 'content_block_delta',
            index: contentBlockIndex,
            delta: { type: 'text_delta', text: delta.content },
          }
        }

        // Kimi reasoning_content (thinking) - convert to GrayCode thinking format
        if (delta.reasoning_content) {
          // Emit thinking block
          yield {
            type: 'content_block_start',
            index: contentBlockIndex,
            content_block: { type: 'thinking', thinking: '' },
          }
          yield {
            type: 'content_block_delta',
            index: contentBlockIndex,
            delta: { type: 'thinking_delta', thinking: delta.reasoning_content },
          }
          yield {
            type: 'content_block_stop',
            index: contentBlockIndex,
          }
          contentBlockIndex++
        }

        // Tool calls
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.id && tc.function?.name) {
              // New tool call starting
              if (hasEmittedContentStart) {
                yield {
                  type: 'content_block_stop',
                  index: contentBlockIndex,
                }
                contentBlockIndex++
                hasEmittedContentStart = false
              }

              const toolBlockIndex = contentBlockIndex
              activeToolCalls.set(tc.index, {
                id: tc.id,
                name: tc.function.name,
                index: toolBlockIndex,
              })

              yield {
                type: 'content_block_start',
                index: toolBlockIndex,
                content_block: {
                  type: 'tool_use',
                  id: tc.id,
                  name: tc.function.name,
                  input: {},
                },
              }
              contentBlockIndex++

              // Emit any initial arguments
              if (tc.function.arguments) {
                yield {
                  type: 'content_block_delta',
                  index: toolBlockIndex,
                  delta: {
                    type: 'input_json_delta',
                    partial_json: tc.function.arguments,
                  },
                }
              }
            } else if (tc.function?.arguments) {
              // Continuation of existing tool call
              const active = activeToolCalls.get(tc.index)
              if (active) {
                yield {
                  type: 'content_block_delta',
                  index: active.index,
                  delta: {
                    type: 'input_json_delta',
                    partial_json: tc.function.arguments,
                  },
                }
              }
            }
          }
        }

        // Finish — guard ensures we only process finish_reason once even if
        // multiple chunks arrive with finish_reason set (some providers do this)
        if (choice.finish_reason && !hasProcessedFinishReason) {
          hasProcessedFinishReason = true

          // Close any open content blocks
          if (hasEmittedContentStart) {
            yield {
              type: 'content_block_stop',
              index: contentBlockIndex,
            }
          }
          // Close active tool calls
          for (const [, tc] of activeToolCalls) {
            yield { type: 'content_block_stop', index: tc.index }
          }

          const stopReason =
            choice.finish_reason === 'tool_calls'
              ? 'tool_use'
              : choice.finish_reason === 'length'
                ? 'max_tokens'
                : 'end_turn'
          lastStopReason = stopReason

          yield {
            type: 'message_delta',
            delta: { stop_reason: stopReason, stop_sequence: null },
            ...(chunkUsage ? { usage: chunkUsage } : {}),
          }
          if (chunkUsage) {
            hasEmittedFinalUsage = true
          }
        }
      }

      if (
        !hasEmittedFinalUsage &&
        chunkUsage &&
        (chunk.choices?.length ?? 0) === 0
      ) {
        yield {
          type: 'message_delta',
          delta: { stop_reason: lastStopReason, stop_sequence: null },
          usage: chunkUsage,
        }
        hasEmittedFinalUsage = true
      }
    }
  }

  yield { type: 'message_stop' }
}

// ---------------------------------------------------------------------------
// The shim client — duck-types as GrayCode SDK
// ---------------------------------------------------------------------------

class OpenAIShimStream {
  private generator: AsyncGenerator<GrayCodeStreamEvent>
  // The controller property is checked by hawk.ts to distinguish streams from error messages
  controller = new AbortController()

  constructor(generator: AsyncGenerator<GrayCodeStreamEvent>) {
    this.generator = generator
  }

  async *[Symbol.asyncIterator]() {
    yield* this.generator
  }
}

class OpenAIShimMessages {
  private defaultHeaders: Record<string, string>

  constructor(defaultHeaders: Record<string, string>) {
    this.defaultHeaders = defaultHeaders
  }

  create(
    params: ShimCreateParams,
    options?: { signal?: AbortSignal; headers?: Record<string, string> },
  ) {
    const self = this

    const promise = (async () => {
      const runtime = resolveOpenAICompatibleRuntime({ model: params.model })
      const response = await self._doRequest(runtime, params, options)

      if (params.stream) {
        return new OpenAIShimStream(
          openaiStreamToGrayCode(response, runtime.request.resolvedModel),
        )
      }

      const data = await response.json()
      return self._convertNonStreamingResponse(data, runtime.request.resolvedModel)
    })()

    ;(promise as unknown as Record<string, unknown>).withResponse =
      async () => {
        const data = await promise
        return {
          data,
          response: new Response(),
          request_id: makeMessageId(),
        }
      }

    return promise
  }

  private async _doRequest(
    runtime: ReturnType<typeof resolveOpenAICompatibleRuntime>,
    params: ShimCreateParams,
    options?: { signal?: AbortSignal; headers?: Record<string, string> },
  ): Promise<Response> {
    return this._doOpenAIRequest(runtime, params, options)
  }

  private async _doOpenAIRequest(
    runtime: ReturnType<typeof resolveOpenAICompatibleRuntime>,
    params: ShimCreateParams,
    options?: { signal?: AbortSignal; headers?: Record<string, string> },
  ): Promise<Response> {
    const request = runtime.request
    const isOpenCodeGO = request.baseUrl.includes('opencode.ai')
    const openaiMessages = convertMessages(
      params.messages as Array<{
        role: string
        message?: { role?: string; content?: unknown }
        content?: unknown
      }>,
      params.system,
      isOpenCodeGO,
    )

    const body: Record<string, unknown> = {
      model: request.resolvedModel,
      messages: openaiMessages,
      max_tokens: params.max_tokens,
      stream: params.stream ?? false,
    }

    // OpenCodeGO/Kimi defaults can be reasoning-heavy and hurt latency on
    // short prompts. Always send an explicit thinking mode so we don't rely on
    // backend defaults. reasoning_content wiring is handled in convertMessages.
    if (isOpenCodeGO) {
      body.thinking = { type: getOpenCodeGOThinkingMode(params) }

      const lastUserImagePromptText = getLastUserImagePromptText(openaiMessages)
      if (lastUserImagePromptText !== null) {
        const quickVisionMaxTokens = getQuickVisionMaxTokens(lastUserImagePromptText)
        if (quickVisionMaxTokens !== null) {
          body.max_tokens = Math.min(params.max_tokens, quickVisionMaxTokens)
        }
      }
    }

    if (params.stream) {
      body.stream_options = { include_usage: true }
    }

    if (params.temperature !== undefined) body.temperature = params.temperature
    if (params.top_p !== undefined) body.top_p = params.top_p

    if (params.tools && params.tools.length > 0) {
      const converted = convertTools(
        params.tools as Array<{
          name: string
          description?: string
          input_schema?: Record<string, unknown>
        }>,
      )
      if (converted.length > 0) {
        body.tools = converted
        if (params.tool_choice) {
          const tc = params.tool_choice as { type?: string; name?: string }
          if (tc.type === 'auto') {
            body.tool_choice = 'auto'
          } else if (tc.type === 'tool' && tc.name) {
            body.tool_choice = {
              type: 'function',
              function: { name: tc.name },
            }
          } else if (tc.type === 'any') {
            body.tool_choice = 'required'
          }
        }
      }
    }

    const runtimeRequest = buildRuntimeRequest(
      runtime,
      this.defaultHeaders,
      options?.headers,
    )

    const response = await fetch(runtimeRequest.url, {
      method: 'POST',
      headers: runtimeRequest.headers,
      body: JSON.stringify(body),
      signal: options?.signal,
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown error')
      throw new Error(`OpenAI API error ${response.status}: ${errorBody}`)
    }

    return response
  }

  private _convertNonStreamingResponse(
    data: {
      id?: string
      model?: string
      choices?: Array<{
        message?: {
          role?: string
          content?: string | null
          reasoning_content?: string | null  // Kimi's thinking content
          tool_calls?: Array<{
            id: string
            function: { name: string; arguments: string }
          }>
        }
        finish_reason?: string
      }>
      usage?: {
        prompt_tokens?: number
        completion_tokens?: number
      }
    },
    model: string,
  ) {
    const choice = data.choices?.[0]
    const content: Array<Record<string, unknown>> = []

    // Add reasoning_content (thinking) first if present
    if (choice?.message?.reasoning_content) {
      content.push({
        type: 'thinking',
        thinking: choice.message.reasoning_content,
      })
    }

    if (choice?.message?.content) {
      content.push({ type: 'text', text: choice.message.content })
    }

    if (choice?.message?.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        let input: unknown
        try {
          input = JSON.parse(tc.function.arguments)
        } catch {
          input = { raw: tc.function.arguments }
        }
        content.push({
          type: 'tool_use',
          id: tc.id,
          name: tc.function.name,
          input,
        })
      }
    }

    const stopReason =
      choice?.finish_reason === 'tool_calls'
        ? 'tool_use'
        : choice?.finish_reason === 'length'
          ? 'max_tokens'
          : 'end_turn'

    return {
      id: data.id ?? makeMessageId(),
      type: 'message',
      role: 'assistant',
      content,
      model: data.model ?? model,
      stop_reason: stopReason,
      stop_sequence: null,
      usage: {
        input_tokens: data.usage?.prompt_tokens ?? 0,
        output_tokens: data.usage?.completion_tokens ?? 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
    }
  }
}

class OpenAIShimBeta {
  messages: OpenAIShimMessages

  constructor(defaultHeaders: Record<string, string>) {
    this.messages = new OpenAIShimMessages(defaultHeaders)
  }
}

export function createOpenAIShimClient(options: {
  defaultHeaders?: Record<string, string>
  maxRetries?: number
  timeout?: number
}): unknown {
  const beta = new OpenAIShimBeta({
    ...(options.defaultHeaders ?? {}),
  })

  return {
    beta,
    messages: beta.messages,
  }
}
