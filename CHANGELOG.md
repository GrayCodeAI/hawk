# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Cost tracking**: Reset delta token tracking on session reset so OpenAI-compatible providers (OpenCodeGO, OpenAI, Grok, Gemini, OpenRouter, Ollama) don't undercount input tokens after `/clear` or session switch
- **Cost calculation**: Deduplicate cache tokens from `input_tokens` before applying input price, preventing double-counting for Anthropic providers
- **Context percentage**: Remove duplicate cache token addition in `calculateContextPercentages` for accurate context window usage display
- **Model pricing**: Add missing pricing for `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano`, `o3-mini`, `o4-mini`, `o3`
- **Dated model variants**: Add prefix matching so `gpt-4.1-2025-04-14` resolves to `gpt-4.1` pricing

### Added

- **Token estimation fallback**: Estimate output tokens from generated content length when OpenAI-compatible providers don't return usage data in streaming mode (e.g., OpenCodeGO, OpenRouter)
- **Tests**: `src/cost-tracker.test.ts` — delta tracking and reset behavior
- **Tests**: `src/modelCost.test.ts` — model pricing accuracy and cache deduplication
- **Tests**: `src/utils/context.test.ts` — context percentage cache deduplication
- **CI**: Run tests on `dev` branch pushes
- **CODEOWNERS**: Auto-assign `@GrayCodeAI/core` for critical files
- **Dependabot**: Weekly dependency updates for npm and GitHub Actions

## [1.0.1] - 2026-04-21

### Changed

- Provider-agnostic architecture supporting 8+ LLM providers
- Real-time token streaming with cost tracking
- 25+ built-in tools for code operations
- MCP (Model Context Protocol) support
- Smart provider routing with failover

---

**Full commit history:** [GitHub Releases](https://github.com/GrayCodeAI/hawk/releases)
