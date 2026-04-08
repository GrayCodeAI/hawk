# eyrie / hawk Repository Split Plan

Based on `langdag` → `herm` pattern analysis.

## Status Update (2026-04-08)

- [x] `providerConfig` extracted into `eyrie` as `src/config/providers.ts`
- [x] `hawk` callsites switched to `@hawk/eyrie` (CLI, shims, tests, scripts)
- [x] `hawk/src/services/api/providerConfig.ts` removed (no runtime references remain)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                           hawk (CLI/TUI App)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  UI Layer (React Ink components, commands, screens)       │   │
│  │  State Management (AppState, sessions, history)          │   │
│  │  Tool Implementations (Bash, Read, Write, etc.)          │   │
│  │  Config Loading (global + project)                       │   │
│  │  Permission System (UI prompts, rules)                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  eyrie npm package (import '@hawk/eyrie')                │   │
│  │  • Models & API configs                                  │   │
│  │  • Provider clients (OpenAI, Codex, Ollama)              │   │
│  │  • Types (Message, Tool, Usage)                          │   │
│  │  • API limits & constants                                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    LLM Provider APIs
```

## Key Design Principles (from langdag/herm)

1. **eyrie owns all provider/model logic** - hawk only configures it
2. **eyrie exports minimal surface** - main Client + types
3. **hawk has its own Config** - maps to eyrie.Config
4. **No circular dependencies** - eyrie is dependency-free except SDK
5. **Types live in eyrie** - hawk imports from eyrie

---

## Phase 1: Files Moving to eyrie

### 1.1 API Provider Layer (`src/services/api/`)

**MOVE to eyrie:**
```
src/services/api/
├── providerConfig.ts        # Model resolution, provider configs
├── openaiShim.ts            # OpenAI provider implementation
├── codexShim.ts             # Codex provider implementation
├── client.ts                # GrayCode API client factory
├── errors.ts                # API error types
├── errorUtils.ts            # Error utilities
├── emptyUsage.ts            # Usage default values
├── withRetry.ts             # Retry logic
└── hawk.ts                  # Main API client (partial - see below)
```

**KEEP in hawk:**
```
src/services/api/
├── bootstrap.ts             # App initialization (uses eyrie)
├── filesApi.ts              # File upload logic
├── logging.ts               # Analytics logging (hawk-specific)
├── metricsOptOut.ts         # Privacy settings (hawk-specific)
├── dumpPrompts.ts           # Debug features
├── referral.ts              # Business logic
├── usage.ts                 # Usage tracking (hawk UI)
├── ultrareviewQuota.ts      # Feature-specific
├── overageCreditGrant.ts    # Billing
├── firstTokenDate.ts        # Analytics
├── adminRequests.ts         # Admin features
├── grove.ts                 # Specific endpoints
├── sessionIngress.ts        # Session management
└── promptCacheBreakDetection.ts  # Debug feature
```

### 1.2 Constants (`src/constants/`)

**MOVE to eyrie:**
```
src/constants/
├── apiLimits.ts             # ✓ Already dependency-free
└── betas.ts                 # API beta headers
```

**KEEP in hawk:**
```
src/constants/
├── common.ts
├── cyberRiskInstruction.ts
├── errorIds.ts
├── figures.ts
├── files.ts
├── github-app.ts
├── keys.ts                  # GrowthBook keys only
├── messages.ts
├── oauth.ts
├── outputStyles.ts
├── product.ts
├── prompts.ts
├── spinnerVerbs.ts
├── system.ts                # System prompts (hawk-specific)
├── systemPromptSections.ts
├── toolLimits.ts
├── tools.ts
├── turnCompletionVerbs.ts
└── xml.ts
```

### 1.3 Types (`src/types/`)

**MOVE to eyrie (Core Types):**
```
src/types/
├── ids.ts                   # SessionId, AgentId
├── logs.ts                  # Log types
└── connectorText.ts         # Connector types
```

**KEEP in hawk (App Types):**
```
src/types/
├── command.ts               # Command types
├── hooks.ts                 # Hook system
├── permissions.ts           # Permission system
├── plugin.ts                # Plugin system
├── textInputTypes.ts        # UI types
└── generated/               # Generated types
```

**SPLIT - Move base types to eyrie, keep hawk extensions:**
```
# Create eyrie/src/types/message.ts with base types:
export interface Message { ... }
export interface UserMessage { ... }
export interface AssistantMessage { ... }

# Keep hawk/src/types/message.ts with extended types:
export interface SystemLocalCommandMessage { ... }  # Hawk-specific
export interface ProgressMessage { ... }            # Hawk-specific
```

### 1.4 Utilities

**MOVE to eyrie (Pure utilities):**
```
src/utils/
├── model/
│   ├── providers.ts         # Provider detection
│   └── model.ts             # Model utilities
└── envUtils.ts              # Environment utilities (partial)
```

**KEEP in hawk:**
```
src/utils/
├── agentContext.ts
├── analytics/
├── auth.ts                  # OAuth (hawk-specific)
├── aws.ts
├── bash/
├── browserTools/
├── config.ts                # Config loading (hawk)
├── contentArray.ts
├── context.ts
├── cost.ts
├── debug.ts                 # Debugging
├── diagLogs.ts
├── diff.ts
├── effort.ts
├── envValidation.ts
├── errors.ts
├── etc...
```

---

## Phase 2: eyrie Package Structure

```
eyrie/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts             # Main exports
│   ├── types/
│   │   ├── index.ts         # Type exports
│   │   ├── message.ts       # Base message types
│   │   ├── connector.ts     # Connector types
│   │   └── ids.ts           # ID types
│   ├── config/
│   │   ├── index.ts
│   │   ├── providers.ts     # Provider configs
│   │   └── models.ts        # Model resolution
│   ├── client/
│   │   ├── index.ts
│   │   ├── graycode.ts      # GrayCode client
│   │   ├── openai.ts        # OpenAI shim
│   │   └── codex.ts         # Codex shim
│   ├── constants/
│   │   └── limits.ts        # API limits
│   └── errors/
│       ├── index.ts
│       └── types.ts         # Error types
├── dist/                    # Build output
└── node_modules/
```

### eyrie package.json

```json
{
  "name": "@hawk/eyrie",
  "version": "0.1.0",
  "description": "Core LLM client library for hawk",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./types": {
      "import": "./dist/types/index.js",
      "types": "./dist/types/index.d.ts"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "bun test"
  },
  "dependencies": {
    "@graycode-ai/sdk": "0.0.3",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/node": "^25.5.0",
    "typescript": "^5.7.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### eyrie Main Exports (src/index.ts)

```typescript
// Client
export { createGrayCodeClient } from './client/graycode.js'
export { resolveProviderRequest } from './config/providers.js'

// Types
export type {
  Message,
  UserMessage,
  AssistantMessage,
  ToolUseBlock,
  ToolResultBlock,
} from './types/message.js'

export type { SessionId, AgentId } from './types/ids.js'

// Config
export type {
  ProviderConfig,
  ResolvedProviderRequest,
} from './config/providers.js'

// Constants
export {
  API_IMAGE_MAX_BASE64_SIZE,
  IMAGE_MAX_WIDTH,
  IMAGE_MAX_HEIGHT,
  PDF_TARGET_RAW_SIZE,
  API_MAX_MEDIA_PER_REQUEST,
} from './constants/limits.js'

// Errors
export {
  APIError,
  AuthenticationError,
  RateLimitError,
} from './errors/types.js'
```

---

## Phase 3: hawk Package Updates

### 3.1 Add eyrie dependency

```json
{
  "dependencies": {
    "@hawk/eyrie": "^0.1.0",
    "@graycode-ai/sdk": "0.0.3",
    "..."
  }
}
```

### 3.2 Import Mappings

**Before (historical):**
```typescript
import { resolveProviderRequest } from './services/api/providerConfig.js'
import { API_MAX_MEDIA_PER_REQUEST } from './constants/apiLimits.js'
import type { AgentId } from './types/ids.js'
```

**After (with eyrie):**
```typescript
import {
  resolveProviderRequest,
  API_MAX_MEDIA_PER_REQUEST,
} from '@hawk/eyrie'
import type { AgentId } from '@hawk/eyrie'
```

### 3.3 Files to Update in hawk

**High Priority (direct API usage):**
1. `src/entrypoints/cli.tsx` - Uses providerConfig
2. `src/services/api/hawk.ts` - Uses many API types
3. `src/services/api/errors.ts` - Error type definitions
4. `src/utils/attachments.ts` - Uses apiLimits
5. `src/utils/imageValidation.ts` - Uses apiLimits
6. `src/utils/pdf.ts` - Uses apiLimits
7. `src/tools/FileReadTool/FileReadTool.ts` - Uses apiLimits
8. `src/cost-tracker.ts` - Uses API types

**Medium Priority:**
9. `src/Tool.ts` - Uses message types
10. `src/services/api/client.ts` - Uses provider utilities

**Low Priority (config):**
11. All files importing from `src/services/api/` need audit

---

## Phase 4: Dependency Analysis

### Provider Config Migration Status (completed 2026-04-08)

```
src/entrypoints/cli.tsx               # Uses: resolveProviderRequest
src/services/api/openaiShim.ts        # Uses: resolveProviderRequest, types
src/services/api/codexShim.ts         # Uses: provider config types
src/services/api/codexShim.test.ts    # Provider config test coverage
scripts/provider-launch.ts            # Uses: resolveCodexApiCredentials
scripts/provider-bootstrap.ts         # Uses: resolveCodexApiCredentials
scripts/system-check.ts               # Uses: resolveProviderRequest/isLocalProviderUrl
```

### Files that import from `src/constants/apiLimits.ts` (8 files)

```
src/utils/imageResizer.ts       # IMAGE_TARGET_RAW_SIZE
src/utils/attachments.ts        # PDF_AT_MENTION_INLINE_THRESHOLD
src/tools/FileReadTool/FileReadTool.ts  # PDF limits
src/services/api/hawk.ts        # API_MAX_MEDIA_PER_REQUEST
src/services/api/errors.ts      # Limits for error messages
src/utils/pdf.ts                # PDF limits
src/utils/imageValidation.ts    # API_IMAGE_MAX_BASE64_SIZE
src/utils/imagePaste.ts         # Image limits
```

### Critical Type Dependencies

**`src/Tool.ts`** imports from:
- `./types/message.js` → MOVE to eyrie
- `./types/permissions.js` → KEEP in hawk
- `./types/tools.js` → KEEP in hawk

**Split strategy:** Move base `Message` types to eyrie, hawk extends them.

---

## Phase 5: Implementation Steps

### Step 1: Create eyrie repo structure
```bash
mkdir eyrie
cd eyrie
git init
# Copy tsconfig.json, package.json from hawk and modify
```

### Step 2: Extract dependency-free files
1. Copy `src/constants/apiLimits.ts` → `eyrie/src/constants/limits.ts`
2. Copy `src/types/ids.ts` → `eyrie/src/types/ids.ts`
3. Copy `src/services/api/providerConfig.ts` → `eyrie/src/config/providers.ts`
4. Copy `src/services/api/errors.ts` → `eyrie/src/errors/types.ts`

### Step 3: Create eyrie build
```bash
cd eyrie
npm install
npm run build
npm link  # For local development
```

### Step 4: Update hawk to use eyrie
```bash
cd hawk
npm link @hawk/eyrie
# Update imports in targeted files
```

### Step 5: Migrate types gradually
1. Move base message types
2. Update hawk imports
3. Test compilation
4. Repeat for other types

### Step 6: Remove duplicates
Once hawk builds successfully:
1. Delete old files from hawk
2. Clean up import paths
3. Verify tests pass

---

## Phase 6: Testing Strategy

### Unit Tests (eyrie)
```typescript
// eyrie/src/config/providers.test.ts
import { test, expect } from 'bun:test'
import { resolveProviderRequest } from './providers.js'

test('resolveProviderRequest with OpenAI model', () => {
  const result = resolveProviderRequest({ model: 'gpt-4o' })
  expect(result.transport).toBe('chat_completions')
})
```

### Integration Tests (hawk)
```typescript
// hawk/tests/eyrie-integration.test.ts
import { test, expect } from 'bun:test'
import { resolveProviderRequest } from '@hawk/eyrie'

test('eyrie integration works', () => {
  // Test that hawk can use eyrie
})
```

---

## Phase 7: Migration Checklist

### Pre-migration
- [ ] Create eyrie repo
- [ ] Set up CI/CD for eyrie
- [ ] Document eyrie API

### Migration
- [ ] Extract apiLimits.ts
- [x] Extract providerConfig.ts to `eyrie/src/config/providers.ts`
- [x] Update hawk provider-config imports to `@hawk/eyrie`
- [x] Remove duplicate `hawk/src/services/api/providerConfig.ts`
- [ ] Extract error types
- [ ] Extract base message types
- [ ] Extract provider clients
- [ ] Update hawk imports
- [ ] Verify hawk builds
- [ ] Run hawk tests

### Post-migration
- [ ] Remove duplicate files from hawk
- [ ] Update documentation
- [ ] Publish eyrie to npm (or use git submodule)
- [ ] Update hawk CI to install eyrie

---

## Risk Mitigation

### Risk 1: Circular Dependencies
**Mitigation:** Keep eyrie dependency-free except SDK
- No imports from hawk
- No UI dependencies
- No file system operations (except where needed)

### Risk 2: Type Incompatibility
**Mitigation:** Gradual migration
- Keep old exports during transition
- Use type assertions if needed
- Comprehensive testing

### Risk 3: Breaking Changes
**Mitigation:** Version management
- Start with eyrie@0.1.0
- Pin version in hawk
- Update hawk after eyrie stabilizes

### Risk 4: Build Complexity
**Mitigation:** Tooling
- Use npm workspaces or pnpm
- Set up watch mode for development
- Clear build scripts

---

## Example: File Migration

### Before (hawk/src/services/api/providerConfig.ts)
```typescript
import { existsSync, readFileSync } from 'node:fs'
import { isEnvTruthy } from '../../utils/envUtils.js'  // PROBLEM: imports from hawk

export function resolveProviderRequest(...) { ... }
```

### After (eyrie/src/config/providers.ts)
```typescript
// NO imports from hawk!
// Copy isEnvTruthy utility into eyrie

function isEnvTruthy(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return value === '1' || value.toLowerCase() === 'true'
}

export function resolveProviderRequest(...) { ... }
```

### hawk/src/entrypoints/cli.tsx update
```typescript
// BEFORE
import { resolveProviderRequest } from '../services/api/providerConfig.js'

// AFTER
import { resolveProviderRequest } from '@hawk/eyrie'
```

---

## Timeline Estimate

- **Week 1:** Create eyrie structure, extract apiLimits + ids
- **Week 2:** Extract providerConfig, errors
- **Week 3:** Extract message types, build eyrie
- **Week 4:** Update hawk imports, testing
- **Week 5:** Cleanup, documentation, CI setup

---

## Success Criteria

1. eyrie builds successfully standalone
2. hawk imports from eyrie with no errors
3. All hawk tests pass
4. No duplicate code between repos
5. Clear separation of concerns
6. Documentation complete

---

## Questions to Resolve

1. **npm scope:** Do you own `@hawk` on npm? If not, use `hawk-eyrie` or `@hawk-code/eyrie`
2. **Repo location:** Separate repos or monorepo? (langdag/herm use separate)
3. **Versioning:** Follow semver from the start
4. **Documentation:** API docs, migration guide, examples

---

*This plan follows the proven langdag → herm architecture pattern.*
