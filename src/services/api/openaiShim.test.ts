import { afterEach, beforeEach, expect, test } from 'bun:test'
import { createOpenAIShimClient } from './openaiShim.ts'

type FetchType = typeof globalThis.fetch

const originalEnv = {
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
  ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,
  ANTHROPIC_VERSION: process.env.ANTHROPIC_VERSION,
}

const originalFetch = globalThis.fetch

function makeSseResponse(lines: string[]): Response {
  const encoder = new TextEncoder()
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const line of lines) {
          controller.enqueue(encoder.encode(line))
        }
        controller.close()
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
      },
    },
  )
}

function makeStreamChunks(chunks: unknown[]): string[] {
  return [
    ...chunks.map(chunk => `data: ${JSON.stringify(chunk)}\n\n`),
    'data: [DONE]\n\n',
  ]
}

beforeEach(() => {
  process.env.OPENAI_BASE_URL = 'http://example.test/v1'
  process.env.OPENAI_API_KEY = 'test-key'
})

afterEach(() => {
  process.env.OPENAI_BASE_URL = originalEnv.OPENAI_BASE_URL
  process.env.OPENAI_API_KEY = originalEnv.OPENAI_API_KEY
  process.env.ANTHROPIC_API_KEY = originalEnv.ANTHROPIC_API_KEY
  process.env.ANTHROPIC_MODEL = originalEnv.ANTHROPIC_MODEL
  process.env.ANTHROPIC_BASE_URL = originalEnv.ANTHROPIC_BASE_URL
  process.env.ANTHROPIC_VERSION = originalEnv.ANTHROPIC_VERSION
  globalThis.fetch = originalFetch
})

test('preserves usage from final OpenAI stream chunk with empty choices', async () => {
  globalThis.fetch = (async (_input, init) => {
    const url = typeof _input === 'string' ? _input : _input.url
    expect(url).toBe('http://example.test/v1/chat/completions')

    const body = JSON.parse(String(init?.body))
    expect(body.stream).toBe(true)
    expect(body.stream_options).toEqual({ include_usage: true })

    const chunks = makeStreamChunks([
      {
        id: 'chatcmpl-1',
        object: 'chat.completion.chunk',
        model: 'fake-model',
        choices: [
          {
            index: 0,
            delta: { role: 'assistant', content: 'hello world' },
            finish_reason: null,
          },
        ],
      },
      {
        id: 'chatcmpl-1',
        object: 'chat.completion.chunk',
        model: 'fake-model',
        choices: [
          {
            index: 0,
            delta: {},
            finish_reason: 'stop',
          },
        ],
      },
      {
        id: 'chatcmpl-1',
        object: 'chat.completion.chunk',
        model: 'fake-model',
        choices: [],
        usage: {
          prompt_tokens: 123,
          completion_tokens: 45,
          total_tokens: 168,
        },
      },
    ])

    return makeSseResponse(chunks)
  }) as FetchType

  const client = createOpenAIShimClient({}) as {
    beta: {
      messages: {
        create: (
          params: Record<string, unknown>,
          options?: Record<string, unknown>,
        ) => Promise<unknown> & {
          withResponse: () => Promise<{ data: AsyncIterable<Record<string, unknown>> }>
        }
      }
    }
  }

  const result = await client.beta.messages
    .create({
      model: 'fake-model',
      system: 'test system',
      messages: [{ role: 'user', content: 'hello' }],
      max_tokens: 64,
      stream: true,
    })
    .withResponse()

  const events: Array<Record<string, unknown>> = []
  for await (const event of result.data) {
    events.push(event)
  }

  const usageEvent = events.find(
    event => event.type === 'message_delta' && typeof event.usage === 'object' && event.usage !== null,
  ) as { usage?: { input_tokens?: number; output_tokens?: number } } | undefined

  expect(usageEvent).toBeDefined()
  expect(usageEvent?.usage?.input_tokens).toBe(123)
  expect(usageEvent?.usage?.output_tokens).toBe(45)
})

test('sends Anthropic compatibility headers in anthropic mode', async () => {
  process.env.ANTHROPIC_API_KEY = 'anthropic-test-key'
  process.env.ANTHROPIC_MODEL = 'claude-3-5-sonnet-latest'
  process.env.ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1'
  process.env.ANTHROPIC_VERSION = '2023-06-01'

  globalThis.fetch = (async (_input, init) => {
    const url = typeof _input === 'string' ? _input : _input.url
    expect(url).toBe('https://api.anthropic.com/v1/chat/completions')

    const headers = init?.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer anthropic-test-key')
    expect(headers['x-api-key']).toBe('anthropic-test-key')
    expect(headers['anthropic-version']).toBe('2023-06-01')

    return new Response(
      JSON.stringify({
        id: 'chatcmpl-anthropic-1',
        model: 'claude-3-5-sonnet-latest',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'hello from anthropic mode',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 12,
          completion_tokens: 7,
          total_tokens: 19,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }) as FetchType

  const client = createOpenAIShimClient({}) as {
    beta: {
      messages: {
        create: (
          params: Record<string, unknown>,
          options?: Record<string, unknown>,
        ) => Promise<Record<string, unknown>>
      }
    }
  }

  const result = await client.beta.messages.create({
    model: 'claude-3-5-sonnet-latest',
    system: 'test system',
    messages: [{ role: 'user', content: 'hello' }],
    max_tokens: 64,
    stream: false,
  })

  expect(result.stop_reason).toBe('end_turn')
})
