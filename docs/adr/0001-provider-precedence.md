# ADR 0001: Provider Precedence and Runtime Resolution

- Status: Accepted
- Date: 2026-04-09

## Context

Hawk supports multiple providers and also keeps compatibility environment variables (`OPENAI_*`) for broad integration. Mixed key presence can cause provider leakage (for example, stale `OPENAI_API_KEY` overriding selected OpenRouter/Grok/Gemini profiles).

## Decision

Hawk applies provider-scoped precedence before generic OpenAI compatibility:

1. `OPENROUTER_API_KEY`
2. `GROK_API_KEY` / `XAI_API_KEY`
3. `GEMINI_API_KEY`
4. `ANTHROPIC_API_KEY`
5. `OPENAI_API_KEY`
6. `OLLAMA_BASE_URL` (keyless local mode)

Runtime resolution is delegated to eyrie (`resolveOpenAICompatibleRuntime`), and Hawk profile loading hydrates scoped env vars first (`utils/providerConfig.ts`).

## Consequences

- Reduces cross-provider key/model leakage.
- Keeps a single runtime-resolution source of truth.
- Preserves compatibility for OpenAI-style consumers while honoring explicit provider profiles.
