# Contributing to Hawk

Thank you for your interest in contributing to Hawk! This document outlines the workflow, conventions, and expectations for contributors.

## Branch Strategy

We use a two-branch model:

| Branch | Purpose | Protection |
|--------|---------|------------|
| `main` | Production-ready releases | PR required + 1 approval + CI passing |
| `dev` | Active development, integration | Direct push allowed + CI must pass |

### Workflow

1. **Branch from `dev`**
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/your-feature-name
   ```

2. **Make changes** following our coding conventions (see [ARCHITECTURE.md](ARCHITECTURE.md))

3. **Run tests locally**
   ```bash
   bun install
   bun run build
   bun test
   bun run smoke
   ```

4. **Open a Pull Request to `dev`**
   - Use clear commit messages following [Conventional Commits](https://www.conventionalcommits.org/)
   - Reference any related issues
   - Ensure CI passes (200+ tests)

5. **Merge to `main`** is done by maintainers from `dev` only

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/) for automated changelog generation:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation only
- `style` — Formatting, missing semi-colons, etc.
- `refactor` — Code change that neither fixes a bug nor adds a feature
- `perf` — Performance improvement
- `test` — Adding or correcting tests
- `chore` — Build process, dependencies, tooling

**Examples:**
```
feat: add OpenCodeGO provider support
fix(cost): deduplicate cache tokens in cost calculation
docs: update ARCHITECTURE.md with provider flow diagram
```

## Testing

All changes must include tests. We use Bun's built-in test runner:

```bash
# Run all tests
bun test

# Run specific test file
bun test src/cost-tracker.test.ts

# Run with watch mode
bun test --watch
```

### Test Coverage Areas

- **Provider tests** (`src/services/api/*.test.ts`) — API shims, runtime resolution
- **Cost tests** (`src/cost-tracker.test.ts`, `src/modelCost.test.ts`) — Token counting, pricing
- **Context tests** (`src/utils/context.test.ts`) — Context window resolution

## Code Review

- All PRs to `main` require 1 approval
- CODEOWNERS automatically assigns `@GrayCodeAI/core` for critical files
- CI must pass before merge
- Linear history is enforced (no merge commits)

## Reporting Issues

- Use [GitHub Issues](https://github.com/GrayCodeAI/hawk/issues)
- Include provider, model, and reproduction steps
- Tag with appropriate labels (`bug`, `feature`, `provider`, etc.)

## Security

See [SECURITY.md](SECURITY.md) for vulnerability disclosure.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
