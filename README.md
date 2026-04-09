# Hawk

<p align="center">
  <img src="hawk-cli.png" alt="Hawk CLI" width="800">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/hawk">
    <img src="https://img.shields.io/npm/v/hawk?style=flat&color=blue" alt="npm version">
  </a>
  <a href="https://github.com/GrayCodeAI/hawk/releases">
    <img src="https://img.shields.io/github/v/release/GrayCodeAI/hawk?style=flat" alt="GitHub Release">
  </a>
  <a href="https://github.com/GrayCodeAI/hawk/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/GrayCodeAI/hawk" alt="License">
  </a>
  <a href="https://x.com/Lakshman2302">
    <img src="https://img.shields.io/twitter/follow/Lakshman2302?style=flat&color=1da1f2" alt="X (Twitter)">
  </a>
  <a href="https://discord.gg/AyGB7TjA">
    <img src="https://img.shields.io/discord/1346295526255403012?style=flat&color=5865F2" alt="Discord">
  </a>
</p>

> Hawk CLI opened to any LLM — OpenAI, Gemini, Grok, OpenRouter, Ollama, and 200+ models.

## Features

- 🤖 **Multi-Provider** — Works with OpenAI, Hawk, Gemini, DeepSeek, Ollama, and any OpenAI-compatible API
- 🛠️ **Full Tool Suite** — Bash, File editing, Grep, Glob, WebFetch, Agents, MCP
- 🔄 **Streaming** — Real-time token streaming
- 📡 **OpenAI Shim** — Translation layer between Hawk and any LLM API
- 💾 **Local Models** — Run offline with Ollama or LM Studio

## Installation

### npm

```bash
npm install -g hawk
```

### Homebrew

```bash
brew install hawk
```

### From Source

```bash
git clone https://github.com/GrayCodeAI/hawk.git
cd hawk
bun install
bun run build
npm link
```

## Quick Start

```bash
bun run profile:init -- --provider openai --api-key sk-your-key --model gpt-4o
hawk
```

Hawk stores provider configuration in `~/.hawk/provider.json` and loads it on startup, similar to Herm. Environment variables are still supported as explicit overrides.

Provider resolution is provider-scoped (Herm/Langdag style): OpenRouter, Grok/xAI, and Gemini keys are preferred over `OPENAI_API_KEY` when those providers are configured.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for system and request-flow diagrams.

## Supported Providers

| Provider | Base URL | Notes |
|----------|---------|-------|
| OpenAI | `https://api.openai.com/v1` | Default |
| OpenRouter | `https://openrouter.ai/api/v1` | Stores `openrouter_api_key` |
| Anthropic (OpenAI-compatible) | `https://api.anthropic.com/v1` | Stores `anthropic_api_key` |
| Grok / xAI | `https://api.x.ai/v1` | Stores `grok_api_key` or `xai_api_key` |
| DeepSeek | `https://api.deepseek.com/v1` | |
| Together AI | `https://api.together.xyz/v1` | |
| Groq | `https://api.groq.com/openai/v1` | Free tier |
| Mistral | `https://api.mistral.ai/v1` | |
| Azure OpenAI | `https://*.openai.azure.com/openai/deployments/*/v1` | |
| Ollama | `http://localhost:11434/v1` | Local, no API key |
| LM Studio | `http://localhost:1234/v1` | Local |

## Provider Config

Provider config is stored at `~/.hawk/provider.json`.

| Field | Description |
|-------|-------------|
| `anthropic_api_key` | Anthropic key |
| `openai_api_key` | OpenAI or OpenAI-compatible key |
| `openrouter_api_key` | OpenRouter key |
| `grok_api_key` / `xai_api_key` | Grok / xAI key |
| `gemini_api_key` | Gemini key |
| `ollama_base_url` | Ollama host, for example `http://localhost:11434` |
| `active_model` | Default model |

If multiple providers are configured, Hawk uses this priority: Anthropic, OpenAI, OpenRouter, Grok, Gemini, Ollama.

## Model Catalog

Hawk model lists are dynamic and provider-scoped:

- `/refresh-model-catalog` refreshes the local cache at `~/.hawk/model_catalog.json`.
- `/debug-model-catalog` shows source, timestamp, and per-provider counts.
- OpenRouter model catalog entries are fetched live when an OpenRouter key is configured.

## Usage Examples

### OpenAI

```bash
bun run profile:init -- --provider openai --api-key sk-... --model gpt-4o
hawk
```

### Anthropic

```bash
bun run profile:anthropic -- --api-key sk-ant-... --model claude-3-5-sonnet-latest
hawk
```

### Grok

```bash
bun run profile:grok -- --api-key xai-... --model grok-2
hawk
```

### DeepSeek

```bash
export HAWK_CODE_USE_OPENAI=1
export OPENAI_API_KEY=sk-...
export OPENAI_BASE_URL=https://api.deepseek.com/v1
export OPENAI_MODEL=deepseek-chat
```

### Ollama (Local)

```bash
ollama pull llama3.2

bun run profile:init -- --provider ollama --model llama3.2 --base-url http://localhost:11434
hawk
```

## Commands

| Command | Description |
|--------|------------|
| `hawk` | Start the CLI |
| `hawk --version` | Show version |
| `hawk --help` | Show help |

## Development

```bash
# Install dependencies
bun install

# Build
bun run build

# Run in development
bun run dev

# Validate environment
bun run doctor:runtime

# Quick sanity check
bun run smoke
```

## Contributing

Contributions are welcome! Please read our [contributing guide](CONTRIBUTING.md) first.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security

See [SECURITY.md](SECURITY.md) for our security policy.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- [X (Twitter)](https://x.com/Lakshman2302)
- [Discord](https://discord.gg/AyGB7TjA)
- [GitHub Issues](https://github.com/GrayCodeAI/hawk/issues)
