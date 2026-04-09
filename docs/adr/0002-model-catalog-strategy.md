# ADR 0002: Model Catalog Strategy (Embedded + Cache + Live Enrichment)

- Status: Accepted
- Date: 2026-04-09

## Context

Hawk needs fast startup, offline resilience, and fresh model availability for dynamic providers (especially OpenRouter). A purely hardcoded list goes stale; a purely remote list adds fragility.

## Decision

Use a layered model-catalog strategy:

- Embedded defaults in eyrie for deterministic fallback.
- Local cache at `~/.hawk/model_catalog.json` for startup speed and offline continuity.
- Background refresh from remote catalog source.
- Optional provider live enrichment (OpenRouter `/models`) when the corresponding key is configured.

Hawk uses `utils/model/providerCatalog.ts` as adapter over eyrie catalog APIs.

## Consequences

- CLI remains usable without network.
- Model lists refresh without blocking startup.
- Provider-specific catalogs stay current where live APIs are available.
- Debuggability is improved via `/debug-model-catalog` and `/refresh-model-catalog`.
