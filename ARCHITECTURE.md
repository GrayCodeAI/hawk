# Hawk Architecture

This document reflects the current code paths in `hawk` and the `@hawk/eyrie` integration used for provider/runtime and model catalog behavior.

## 1) Context (C4-L1)

```mermaid
flowchart LR
  DEV[Developer] --> CLI[Hawk CLI]
  CLI --> FS[Local Filesystem<br/>workspace + ~/.hawk]
  CLI --> MCP[MCP Servers]
  CLI --> E["eyrie package"]
  E --> PROVIDERS[LLM Provider APIs]
```

## 2) Containers (C4-L2)

```mermaid
flowchart TB
  subgraph HawkCLI["Hawk CLI Application"]
    ENTRY["CLI Entrypoint<br/>src/entrypoints/cli.tsx"]
    INIT["Bootstrap / Init<br/>src/entrypoints/init.ts"]
    APP["UI + Commands Layer<br/>screens, commands, components"]
    QE["Query Engine<br/>src/QueryEngine.ts"]
    TOOLS["Tool Runtime<br/>src/tools/*"]
    API["API Orchestration<br/>src/services/api/*"]
    CFG["Provider Config Adapter<br/>src/utils/providerConfig.ts"]
    CATALOG["Provider Catalog Adapter<br/>src/utils/model/providerCatalog.ts"]
    STATE["State + Session Store<br/>src/state/* + src/bootstrap/state.ts"]
  end

  ENTRY --> CFG
  ENTRY --> INIT
  INIT --> APP
  APP --> QE
  QE --> TOOLS
  QE --> API
  API --> E["eyrie package"]
  APP --> CATALOG
  CATALOG --> E
  APP --> STATE
```

## 3) Core Runtime Flow (request path)

```mermaid
sequenceDiagram
  participant U as User
  participant C as CLI / REPL
  participant Q as QueryEngine
  participant A as API Layer (hawk.ts + client.ts)
  participant E as eyrie Runtime Resolver
  participant P as Provider API

  U->>C: Prompt / command
  C->>Q: submitMessage(...)
  Q->>A: getLLMClient(...)
  A->>E: detect provider + resolve runtime
  E-->>A: mode + base URL + model + key source
  A->>P: Chat request (stream/non-stream)
  P-->>A: Tokens / tool calls / deltas
  A-->>Q: normalized events
  Q-->>C: messages + tool execution events
  C-->>U: rendered response
```

## 4) Provider Config + Model Catalog Flow

```mermaid
sequenceDiagram
  participant CLI as CLI Startup
  participant CFG as providerConfig.ts
  participant HOME as ~/.hawk/provider.json
  participant CAT as providerCatalog.ts
  participant E as eyrie catalog
  participant CACHE as ~/.hawk/model_catalog.json

  CLI->>CFG: applyProviderConfigToEnv()
  CFG->>HOME: load provider profile
  HOME-->>CFG: provider + keys + model
  CFG-->>CLI: env hydrated (provider-scoped + compat vars)

  CLI->>CAT: getProviderCatalogEntries(...)
  CAT->>CACHE: load cached catalog
  CAT->>E: fetchModelCatalog(...) in background
  E->>CACHE: write refreshed catalog
  E-->>CAT: provider catalog
```

## 5) Responsibilities

- Hawk owns product runtime: CLI UX, command system, tool orchestration, app/session state, and local persistence.
- Eyrie owns provider/runtime concerns: provider detection, base URL/model/key resolution, provider catalogs, and compatibility shaping.
- The integration boundary is intentionally narrow: Hawk calls eyrie for provider/runtime/model intelligence and keeps product logic local.

## 6) Detailed Design

- See [COMPONENTS.md](./COMPONENTS.md) for C4-L3 component diagrams of Hawk critical modules.
- See ADRs in [docs/adr](./docs/adr/) for key architecture decisions.
