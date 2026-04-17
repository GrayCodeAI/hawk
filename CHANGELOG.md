# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2026-04-16

### Added
- FUNDING.yml template for GitHub Sponsors
- CODE_OF_CONDUCT.md following Contributor Covenant
- LinkedIn badge to README

### Changed
- **README**: Modernized layout with updated badge style
- **README**: Clarified provider count (8 official profiles + OpenAI-compatible)
- **README**: Updated Discord and X links to official GrayCodeAI accounts
- **README**: Updated provider config instructions to use `/config` command
- **.gitignore**: Comprehensive patterns for OS, IDE, cache, and Python files

### Removed
- No files removed in this release

### Fixed
- Discord badge showing "invalid" by using static badge style

## [1.0.0] - 2026-04-07

Initial release of Hawk CLI.

### Features
- Multi-provider support (OpenAI, Anthropic, Gemini, Grok, OpenRouter, Ollama)
- Complete tool suite (Bash, File Edit, Grep, Glob, WebFetch, Agents, MCP)
- Real-time token streaming
- OpenAI-compatible API shim for any LLM provider
- Local model support via Ollama/LM Studio
- Smart provider routing with failover
- Cost tracking per session and provider

[Unreleased]: https://github.com/GrayCodeAI/hawk/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/GrayCodeAI/hawk/releases/tag/v1.0.1
[1.0.0]: https://github.com/GrayCodeAI/hawk/releases/tag/v1.0.0