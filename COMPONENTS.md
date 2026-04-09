# Hawk Components (C4-L3)

This document expands Hawk’s internal architecture at component level for the most critical runtime paths.

## 1) CLI Bootstrap and Startup Path

```mermaid
flowchart LR
  ENTRY["entrypoints/cli.tsx"] --> PCFG["applyProviderConfigToEnv()<br/>utils/providerConfig.ts"]
  ENTRY --> VALID["validateProviderEnvOrExit()"]
  ENTRY --> INIT["entrypoints/init.ts"]
  INIT --> CFG["config + env bootstrap"]
  INIT --> NET["proxy/mtls/preconnect"]
  INIT --> OBS["telemetry + diagnostics"]
  INIT --> APP["load REPL / command runtime"]
```

## 2) Query Execution Pipeline

```mermaid
flowchart TB
  UI["REPL / command input"] --> QE["QueryEngine.submitMessage()"]
  QE --> NORM["message normalization + system prompt"]
  QE --> TOOLS["Tool orchestration<br/>Tool + hooks + permissions"]
  QE --> API["query()/hawk.ts"]
  API --> CLIENT["getLLMClient()<br/>services/api/client.ts"]
  CLIENT --> E["eyrie runtime resolver"]
  API --> STREAM["stream conversion + usage accumulation"]
  STREAM --> QE
  QE --> UI_OUT["rendered assistant/tool messages"]
```

## 3) Provider Config and Catalog Components

```mermaid
flowchart LR
  HOME["~/.hawk/provider.json"] --> PCFG["utils/providerConfig.ts"]
  PCFG --> ENV["process.env (scoped + compat)"]
  ENV --> RUNTIME["openaiShim + API layer"]

  CACHE["~/.hawk/model_catalog.json"] --> CAT["utils/model/providerCatalog.ts"]
  CAT --> E["eyrie fetchModelCatalog/loadModelCatalogSync"]
  E --> REMOTE["remote catalog + optional OpenRouter /models"]
  REMOTE --> CACHE
```

## 4) API Layer Components (Critical)

```mermaid
flowchart TB
  HAWK_API["services/api/hawk.ts"] --> RETRY["withRetry.ts"]
  HAWK_API --> LOG["logging.ts"]
  HAWK_API --> ERR["errors.ts + errorUtils.ts"]
  HAWK_API --> SHIM["openaiShim.ts"]
  SHIM --> E["resolveOpenAICompatibleRuntime()"]
  HAWK_API --> CLIENT["client.ts (Anthropic direct vs OpenAI shim)"]
```

## 5) Operational Boundaries

- Hawk core is product/runtime orchestration and is provider-agnostic above the API layer.
- Provider-specific behavior is delegated to eyrie and consumed through a stable integration surface.
- Local persistence boundaries are explicit: `~/.hawk/provider.json` and `~/.hawk/model_catalog.json`.
