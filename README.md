# Hawk

<p align="center">
  <img src="hawk-cli.png" alt="Hawk CLI" width="800">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/hawk">
    <img src="https://img.shields.io/npm/v/hawk?style=flat&color=blue" alt="npm version">
  </a>
  <a href="https://github.com/GrayCodeAI/hawk/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/GrayCodeAI/hawk" alt="License">
  </a>
  <a href="https://twitter.com/graycode">
    <img src="https://img.shields.io/twitter/follow/graycode?style=flat&color=1da1f2" alt="Twitter">
  </a>
</p>

> A CLI for **any LLM** — OpenAI, Gemini, DeepSeek, Ollama, Claude, and 200+ models.

---

## Features

- 🤖 **Multi-Provider** — Works with OpenAI, Claude, Gemini, DeepSeek, Ollama, and any OpenAI-compatible API
- 🛠️ **Full Tool Suite** — Bash, File editing, Grep, Glob, WebFetch, Agents, MCP
- 🔄 **Streaming** — Real-time token streaming
- 📡 **OpenAI Shim** — Translation layer between Hawk and any LLM API
- 💾 **Local Models** — Run offline with Ollama or LM Studio

---

## Quick Start

```bash
# Install via npm
npm install -g hawk

# Or clone and build from source
git clone https://github.com/GrayCodeAI/hawk.git
cd hawk
bun install && bun run build
```

### Configure Your LLM

```bash
export HAWK_CODE_USE_OPENAI=1
export OPENAI_API_KEY=sk-your-key
export OPENAI_MODEL=gpt-4o

hawk
```

---

## Supported Providers

| Provider | Base URL | Notes |
|----------|---------|-------|
| OpenAI | `https://api.openai.com/v1` | Default |
| DeepSeek | `https://api.deepseek.com/v1` | |
| Together AI | `https://api.together.xyz/v1` | |
| Groq | `https://api.groq.com/openai/v1` | Free tier |
| Mistral | `https://api.mistral.ai/v1` | |
| Azure OpenAI | `https://*.openai.azure.com/openai/deployments/*/v1` | |
| Ollama | `http://localhost:11434/v1` | Local, no API key |
| LM Studio | `http://localhost:1234/v1` | Local |

---

## Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `HAWK_CODE_USE_OPENAI` | ✅ | Set to `1` to enable |
| `OPENAI_API_KEY` | ❌* | Your API key (*local models don't need) |
| `OPENAI_MODEL` | ✅ | Model name (e.g., `gpt-4o`, `deepseek-chat`) |
| `OPENAI_BASE_URL` | ❌ | API endpoint (defaults to OpenAI) |

---

## Examples

### OpenAI

```bash
export HAWK_CODE_USE_OPENAI=1
export OPENAI_API_KEY=sk-...
export OPENAI_MODEL=gpt-4o
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

export HAWK_CODE_USE_OPENAI=1
export OPENAI_BASE_URL=http://localhost:11434/v1
export OPENAI_MODEL=llama3.2
hawk
```

---

## Commands

- `hawk` — Start the CLI
- `hawk --version` — Show version
- `bun run doctor:runtime` — Validate environment
- `bun run smoke` — Quick sanity check

---

## License

MIT