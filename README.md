# Hawk

A CLI for **any LLM** — OpenAI, Gemini, DeepSeek, Ollama, Claude, and 200+ models.

![Hawk CLI](hawk-cli.png)

---

## Install

### Option A: npm (recommended)

```bash
npm install -g hawk
```

### Option B: From source (requires Bun)

```bash
# Clone from GitHub
git clone https://github.com/GrayCodeAI/hawk.git
cd hawk

# Install dependencies
bun install

# Build
bun run build

# Link globally (optional)
npm link
```

### Option C: Run directly with Bun (no build step)

```bash
git clone https://github.com/GrayCodeAI/hawk.git
cd hawk
bun install
bun run dev
```

---

## Quick Start

### 1. Set 3 environment variables

```bash
export HAWK_CODE_USE_OPENAI=1
export OPENAI_API_KEY=sk-your-key-here
export OPENAI_MODEL=gpt-4o
```

### 2. Run it

```bash
# If installed via npm
hawk

# If built from source
bun run dev
# or after build:
node dist/cli.mjs
```

That's it. The tool system, streaming, file editing, multi-step reasoning — everything works through the model you picked.

Install via `npm install -g hawk`.

---

## Provider Examples

### OpenAI

```bash
export HAWK_CODE_USE_OPENAI=1
export OPENAI_API_KEY=sk-...
export OPENAI_MODEL=gpt-4o
```

### Codex via ChatGPT auth

`codexplan` maps to GPT-5.4 on the Codex backend with high reasoning.
`codexspark` maps to GPT-5.3 Codex Spark for faster loops.

If you already use the Codex CLI, Hawk will read `~/.codex/auth.json`
automatically. You can also point it elsewhere with `CODEX_AUTH_JSON_PATH` or
override the token directly with `CODEX_API_KEY`.

```bash
export HAWK_CODE_USE_OPENAI=1
export OPENAI_MODEL=codexplan

# optional if you do not already have ~/.codex/auth.json
export CODEX_API_KEY=...

hawk
```

### DeepSeek

```bash
export HAWK_CODE_USE_OPENAI=1
export OPENAI_API_KEY=sk-...
export OPENAI_BASE_URL=https://api.deepseek.com/v1
export OPENAI_MODEL=deepseek-chat
```

### Google Gemini (via OpenRouter)

```bash
export HAWK_CODE_USE_OPENAI=1
export OPENAI_API_KEY=sk-or-...
export OPENAI_BASE_URL=https://openrouter.ai/api/v1
export OPENAI_MODEL=google/gemini-2.0-flash
```

### Ollama (local, free)

```bash
ollama pull llama3.3:70b

export HAWK_CODE_USE_OPENAI=1
export OPENAI_BASE_URL=http://localhost:11434/v1
export OPENAI_MODEL=llama3.3:70b
# no API key needed for local models
```

### LM Studio (local)

```bash
export HAWK_CODE_USE_OPENAI=1
export OPENAI_BASE_URL=http://localhost:1234/v1
export OPENAI_MODEL=your-model-name
```

### Together AI

```bash
export HAWK_CODE_USE_OPENAI=1
export OPENAI_API_KEY=...
export OPENAI_BASE_URL=https://api.together.xyz/v1
export OPENAI_MODEL=meta-llama/Llama-3.3-70B-Instruct-Turbo
```

### Groq

```bash
export HAWK_CODE_USE_OPENAI=1
export OPENAI_API_KEY=gsk_...
export OPENAI_BASE_URL=https://api.groq.com/openai/v1
export OPENAI_MODEL=llama-3.3-70b-versatile
```

### Mistral

```bash
export HAWK_CODE_USE_OPENAI=1
export OPENAI_API_KEY=...
export OPENAI_BASE_URL=https://api.mistral.ai/v1
export OPENAI_MODEL=mistral-large-latest
```

### Azure OpenAI

```bash
export HAWK_CODE_USE_OPENAI=1
export OPENAI_API_KEY=your-azure-key
export OPENAI_BASE_URL=https://your-resource.openai.azure.com/openai/deployments/your-deployment/v1
export OPENAI_MODEL=gpt-4o
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HAWK_CODE_USE_OPENAI` | Yes | Set to `1` to enable the OpenAI provider |
| `OPENAI_API_KEY` | Yes* | Your API key (*not needed for local models like Ollama) |
| `OPENAI_MODEL` | Yes | Model name (e.g. `gpt-4o`, `deepseek-chat`, `llama3.3:70b`) |
| `OPENAI_BASE_URL` | No | API endpoint (defaults to `https://api.openai.com/v1`) |
| `CODEX_API_KEY` | Codex only | Codex/ChatGPT access token override |
| `CODEX_AUTH_JSON_PATH` | Codex only | Path to a Codex CLI `auth.json` file |
| `CODEX_HOME` | Codex only | Alternative Codex home directory (`auth.json` will be read from here) |

You can also use `GRAYCODE_MODEL` (or legacy `ANTHROPIC_MODEL`) to override the model name. `OPENAI_MODEL` takes priority.

---

## Runtime Hardening

Use these commands to keep the CLI stable and catch environment mistakes early:

```bash
# quick startup sanity check
bun run smoke

# validate provider env + reachability
bun run doctor:runtime

# print machine-readable runtime diagnostics
bun run doctor:runtime:json

# persist a diagnostics report to reports/doctor-runtime.json
bun run doctor:report

# full local hardening check (typecheck + smoke + runtime doctor)
bun run hardening:check

# strict hardening (includes project-wide typecheck)
bun run hardening:strict
```

Notes:
- `doctor:runtime` fails fast if `HAWK_CODE_USE_OPENAI=1` with a placeholder key (`SUA_CHAVE`) or a missing key for non-local providers.
- Local providers (for example `http://localhost:11434/v1`) can run without `OPENAI_API_KEY`.
- Codex profiles validate `CODEX_API_KEY` or the Codex CLI auth file and probe `POST /responses` instead of `GET /models`.

### Provider Launch Profiles

Use profile launchers to avoid repeated environment setup:

```bash
# one-time profile bootstrap (auto-detect ollama, otherwise openai)
bun run profile:init

# codex bootstrap (defaults to codexplan and ~/.codex/auth.json)
bun run profile:codex

# openai bootstrap with explicit key
bun run profile:init -- --provider openai --api-key sk-...

# ollama bootstrap with custom model
bun run profile:init -- --provider ollama --model llama3.1:8b

# codex bootstrap with a fast model alias
bun run profile:init -- --provider codex --model codexspark

# launch using persisted profile (.hawk-profile.json)
bun run dev:profile

# codex profile (uses CODEX_API_KEY or ~/.codex/auth.json)
bun run dev:codex

# OpenAI profile (requires OPENAI_API_KEY in your shell)
bun run dev:openai

# Ollama profile (defaults: localhost:11434, llama3.1:8b)
bun run dev:ollama
```

`dev:openai`, `dev:ollama`, and `dev:codex` run `doctor:runtime` first and only launch the app if checks pass.
For `dev:ollama`, make sure Ollama is running locally before launch.

---

## What Works

- **All tools**: Bash, FileRead, FileWrite, FileEdit, Glob, Grep, WebFetch, WebSearch, Agent, MCP, LSP, NotebookEdit, Tasks
- **Streaming**: Real-time token streaming
- **Tool calling**: Multi-step tool chains (the model calls tools, gets results, continues)
- **Images**: Base64 and URL images passed to vision models
- **Slash commands**: /commit, /review, /compact, /diff, /doctor, etc.
- **Sub-agents**: AgentTool spawns sub-agents using the same provider
- **Memory**: Persistent memory system

## What's Different

- **No thinking mode**: GrayCode's extended thinking is disabled (OpenAI models use different reasoning)
- **No prompt caching**: GrayCode-specific cache headers are skipped
- **No beta features**: GrayCode-specific beta headers are ignored
- **Token limits**: Defaults to 32K max output — some models may cap lower, which is handled gracefully

---

## How It Works

The shim (`src/services/api/openaiShim.ts`) sits between Hawk and the LLM API:

```
Hawk Tool System
        |
        v
  GrayCode SDK interface (duck-typed)
        |
        v
  openaiShim.ts  <-- translates formats
        |
        v
  OpenAI Chat Completions API
        |
        v
  Any compatible model
```

It translates:
- GrayCode message blocks → OpenAI messages
- GrayCode tool_use/tool_result → OpenAI function calls
- OpenAI SSE streaming → GrayCode stream events
- GrayCode system prompt arrays → OpenAI system messages

The rest of Hawk doesn't know it's talking to a different model.

---

## Model Quality Notes

Not all models are equal at agentic tool use. Here's a rough guide:

| Model | Tool Calling | Code Quality | Speed |
|-------|-------------|-------------|-------|
| GPT-4o | Excellent | Excellent | Fast |
| DeepSeek-V3 | Great | Great | Fast |
| Gemini 2.0 Flash | Great | Good | Very Fast |
| Llama 3.3 70B | Good | Good | Medium |
| Mistral Large | Good | Good | Fast |
| GPT-4o-mini | Good | Good | Very Fast |
| Qwen 2.5 72B | Good | Good | Medium |
| Smaller models (<7B) | Limited | Limited | Very Fast |

For best results, use models with strong function/tool calling support.

---

## Files Changed from Original

```
src/services/api/openaiShim.ts   — NEW: OpenAI-compatible API shim (724 lines)
src/services/api/client.ts       — Routes to shim when HAWK_CODE_USE_OPENAI=1
src/utils/model/providers.ts     — Added 'openai' provider type
src/utils/model/configs.ts       — Added openai model mappings
src/utils/model/model.ts         — Respects OPENAI_MODEL for defaults
src/utils/auth.ts                — Recognizes OpenAI as valid 3P provider
```
"# hawk 
