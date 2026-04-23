# Contributing to Hawk

Thank you for your interest in contributing to Hawk! This guide will help you get started.

## Code of Conduct

Be respectful, inclusive, and helpful. We're building something great together.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (latest version)
- Node.js 18+ (for npm compatibility)
- Git

### Setup

```bash
git clone https://github.com/GrayCodeAI/hawk.git
cd hawk
bun install
bun run build
```

### Development Workflow

```bash
# Run in development mode
bun run dev

# Run with a specific provider
bun run dev:openai
bun run dev:ollama
bun run dev:anthropic

# Run tests
bun test

# Type check
bun run typecheck

# Lint
bun run lint

# Build
bun run build
```

## Adding a New Model

Hawk is **model-agnostic** — model names are resolved dynamically from `@hawk/eyrie`. To add a new model:

### 1. Add to `@hawk/eyrie`

In the `@hawk/eyrie` package, add your model config to `ALL_MODEL_CONFIGS`:

```javascript
export const HAWK_NEW_MODEL_CONFIG = {
    anthropic: 'claude-new-model-20260101',
    openai: 'gpt-new',
    gemini: 'gemini-new-pro',
    ollama: 'llama-new:70b',
    // ... other providers
};

export const ALL_MODEL_CONFIGS = {
    // ... existing models
    newmodel: HAWK_NEW_MODEL_CONFIG,
};
```

### 2. That's It

Hawk automatically:
- ✅ Derives display names from the model key (e.g., `newmodel` → `Newmodel`)
- ✅ Generates canonical names (strips date suffixes)
- ✅ Includes it in the model selector
- ✅ Credits it correctly in commit/PR attribution

**No changes needed in Hawk CLI** — the dynamic resolution handles everything.

## Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

feat: add support for new provider
fix: resolve race condition in file watcher
docs: update README with new features
test: add unit tests for model resolution
ci: add GitHub Actions workflow
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

## Pull Request Process

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run the full test suite: `bun test`
5. Ensure type checks pass: `bun run typecheck`
6. Ensure linting passes: `bun run lint`
7. Commit with a conventional commit message
8. Push to your branch
9. Open a Pull Request

### PR Requirements

- [ ] All tests pass (`bun test`)
- [ ] Type checks pass (`bun run typecheck`)
- [ ] Linting passes (`bun run lint`)
- [ ] Build succeeds (`bun run build`)
- [ ] PR title follows conventional commits format

## Architecture Overview

```
hawk/
├── src/
│   ├── utils/
│   │   ├── model/
│   │   │   ├── model.ts          # Model name resolution (dynamic)
│   │   │   └── modelStrings.ts   # Provider-specific model IDs
│   │   ├── attribution.ts        # Commit/PR attribution messages
│   │   └── commitAttribution.ts  # Model sanitization (pass-through)
│   ├── services/api/             # Provider implementations
│   └── tools/                    # Built-in tools
├── .github/workflows/            # CI/CD pipelines
└── package.json
```

### Key Files for Model-agnostic Features

| File | Purpose |
|------|---------|
| `src/utils/model/model.ts` | Dynamic model name resolution from `ALL_MODEL_CONFIGS` |
| `src/utils/attribution.ts` | Generates commit/PR attribution with model name |
| `src/utils/commitAttribution.ts` | Pass-through model sanitization |

## Testing

### Running Tests

```bash
# All tests
bun test

# Specific test file
bun test src/utils/model/model.test.ts

# Provider-specific tests
bun run test:provider

# Smoke test (build + version check)
bun run smoke
```

### Writing Tests

Place tests next to the source file with `.test.ts` suffix:

```typescript
// src/utils/model/model.test.ts
import { describe, expect, test } from 'bun:test'
import { getPublicModelDisplayName } from './model.js'

describe('getPublicModelDisplayName', () => {
  test('returns display name for known models', () => {
    expect(getPublicModelDisplayName('claude-opus-4-6')).toBe('Opus 4.6')
  })
})
```

## CI/CD

Hawk uses GitHub Actions:

- **CI**: Runs on every push/PR — typecheck, lint, tests on 3 OSes, security audit
- **Version Bump**: Auto-increments version on merge to `dev`/`main`
- **Release**: Creates GitHub release + npm publish on tag push
- **Stale Cleanup**: Closes inactive PRs after 30 days

## Reporting Issues

- 🐛 **Bugs**: [GitHub Issues](https://github.com/GrayCodeAI/hawk/issues)
- 💡 **Features**: [GitHub Issues](https://github.com/GrayCodeAI/hawk/issues)
- 🔒 **Security**: See [SECURITY.md](SECURITY.md)

## Questions?

- 💬 [Discord](https://discord.gg/Fmq46SN8)
- 🐦 [X/Twitter](https://x.com/GrayCodeAI)

Thank you for contributing! 🦅
