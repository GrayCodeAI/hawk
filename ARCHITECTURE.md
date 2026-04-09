# Hawk Architecture

## System Overview

```mermaid
flowchart LR
  U[User / CLI Session] --> H[Hawk CLI]
  H --> C[Command + Tool Loop]
  C --> CFG[Provider Config<br/>~/.hawk/provider.json]
  C --> CAT[Model Catalog Cache<br/>~/.hawk/model_catalog.json]
  C --> E["eyrie package"]
  C --> MCP[MCP + Local Tools]
```

## Provider Request Flow

```mermaid
flowchart LR
  C[Hawk Runtime] --> E["eyrie package"]
  E --> R[Runtime Resolver<br/>provider/key/model/base URL]
  R --> S[OpenAI-Compatible Request Shaping]

  S --> OAI[OpenAI]
  S --> OR[OpenRouter]
  S --> ANT[Anthropic compatible]
  S --> GX[xAI / Grok]
  S --> GEM[Gemini compatible]
  S --> OLL[Ollama]
```

## Responsibility Split

- Hawk owns CLI UX, command routing, tools, sessions, and local persistence.
- Eyrie owns provider/runtime resolution, model catalog integration, and request shaping.
