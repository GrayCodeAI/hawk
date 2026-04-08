# Safe Migration Plan: hawk → hawk + eyrie

**Backup Status:** ✓ Created at `../hawk-backup/`

## Status Update (2026-04-08)

- [x] Phase 3 provider configuration cutover completed
- [x] Provider config imports now use `@hawk/eyrie`
- [x] `src/services/api/providerConfig.ts` removed from `hawk`

## Safety First Principles

1. **Never delete original files** until migration is 100% verified
2. **Test at every step** - if tests fail, stop and fix
3. **Git commit at each phase** - easy rollback
4. **Parallel implementation** - eyrie exists alongside hawk initially
5. **Gradual cutover** - one module at a time

---

## Phase 0: Setup & Safety (Day 1)

### Step 0.1: Verify Backup
```bash
# Check backup exists and is complete
ls -la ../hawk-backup/
diff -r ../hawk-backup/src/constants/apiLimits.ts src/constants/apiLimits.ts
# Should show no differences
```

### Step 0.2: Create Git Branches
```bash
# In hawk directory
git checkout -b migration/eyrie-extraction

# Create checkpoint tags
git tag migration-start
git push origin migration/eyrie-extraction
```

### Step 0.3: Create eyrie Directory (Inside hawk initially)
```bash
mkdir -p eyrie/src/{client,config,types,constants,errors}
touch eyrie/package.json
touch eyrie/tsconfig.json
touch eyrie/src/index.ts
```

**Why inside hawk?** Easier development, shared node_modules, can move out later.

---

## Phase 1: Extract Dependency-Free Constants (Day 1-2)

**Target:** `src/constants/apiLimits.ts`
**Risk Level:** LOW (no dependencies)
**Files to Update:** 8 files

### Step 1.1: Copy to eyrie
```bash
cp src/constants/apiLimits.ts eyrie/src/constants/limits.ts
```

### Step 1.2: Update eyrie exports
```typescript
// eyrie/src/index.ts
export {
  API_IMAGE_MAX_BASE64_SIZE,
  IMAGE_TARGET_RAW_SIZE,
  IMAGE_MAX_WIDTH,
  IMAGE_MAX_HEIGHT,
  PDF_TARGET_RAW_SIZE,
  API_PDF_MAX_PAGES,
  PDF_EXTRACT_SIZE_THRESHOLD,
  PDF_MAX_EXTRACT_SIZE,
  PDF_MAX_PAGES_PER_READ,
  PDF_AT_MENTION_INLINE_THRESHOLD,
  API_MAX_MEDIA_PER_REQUEST,
} from './constants/limits.js'
```

### Step 1.3: Update hawk imports (ONE FILE AT A TIME)

**File 1: `src/utils/imageValidation.ts`**
```typescript
// BEFORE:
import { API_IMAGE_MAX_BASE64_SIZE } from '../constants/apiLimits.js'

// AFTER:
import { API_IMAGE_MAX_BASE64_SIZE } from '../../eyrie/src/constants/limits.js'
```

**Test:**
```bash
npm run typecheck
# Fix any errors before moving to next file
```

**File 2-8:** Repeat for all files importing apiLimits

### Step 1.4: Verification
```bash
# Run all tests
npm test

# Run type checking
npm run typecheck

# Build project
npm run build

# Run smoke test
npm run smoke
```

### Step 1.5: Commit
```bash
git add .
git commit -m "Phase 1: Extract apiLimits to eyrie

- Copied apiLimits.ts to eyrie/src/constants/limits.ts
- Updated 8 files to import from eyrie
- All tests passing
- No functional changes"
```

---

## Phase 2: Extract Type Definitions (Day 2-3)

**Target:** `src/types/ids.ts`, base types from `src/types/`
**Risk Level:** MEDIUM (types used everywhere)
**Files to Update:** ~20 files

### Step 2.1: Copy Simple Types
```bash
cp src/types/ids.ts eyrie/src/types/ids.ts
cp src/types/connectorText.ts eyrie/src/types/connector.ts
```

### Step 2.2: Create Base Message Types
```typescript
// eyrie/src/types/message.ts
// Copy ONLY base message types, not hawk-specific extensions

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string | ContentBlock[]
}

export interface UserMessage extends Message {
  role: 'user'
}

export interface AssistantMessage extends Message {
  role: 'assistant'
}

export interface ContentBlock {
  type: 'text' | 'image' | 'tool_use' | 'tool_result'
  // ... base fields
}
```

### Step 2.3: Update Exports
```typescript
// eyrie/src/types/index.ts
export type { SessionId, AgentId } from './ids.js'
export type {
  Message,
  UserMessage,
  AssistantMessage,
  ContentBlock,
} from './message.js'
export type {
  ConnectorTextBlock,
  ConnectorTextDelta,
} from './connector.js'
```

### Step 2.4: Update hawk (GRADUAL)

**Create re-export file first (SAFETY):**
```typescript
// src/types/ids.ts - KEEP ORIGINAL, just re-export
export { SessionId, AgentId } from '../../eyrie/src/types/ids.js'
```

**Test everything still works**

**Then update direct imports:**
```typescript
// src/Tool.ts
// BEFORE:
import type { AgentId } from './types/ids.js'

// AFTER (SAFETY - use re-export):
import type { AgentId } from './types/ids.js'  // Same path!

// The file now re-exports from eyrie
```

### Step 2.5: Verification
```bash
# Type check
npm run typecheck

# Build
npm run build

# Test
npm run test:provider
```

### Step 2.6: Commit
```bash
git add .
git commit -m "Phase 2: Extract base types to eyrie

- Copied ids.ts, connectorText.ts to eyrie
- Created base message types in eyrie
- Updated hawk types to re-export from eyrie
- All type checks passing"
```

---

## Phase 3: Extract Provider Configuration (Day 3-5) - COMPLETED (2026-04-08)

**Target:** `src/services/api/providerConfig.ts`
**Risk Level:** HIGH (complex logic, many dependencies)
**Files to Update:** 4 files + tests

### Step 3.1: Copy with Dependency Injection
```bash
cp src/services/api/providerConfig.ts eyrie/src/config/providers.ts
```

### Step 3.2: Extract Dependencies
```typescript
// eyrie/src/config/providers.ts

// BEFORE (from hawk):
import { isEnvTruthy } from '../../utils/envUtils.js'

// AFTER (self-contained):
function isEnvTruthy(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return value === '1' || value.toLowerCase() === 'true'
}
```

### Step 3.3: Cutover Imports (No Wrapper)
```typescript
// Import directly from published package exports.
import {
  resolveProviderRequest,
  resolveCodexApiCredentials,
  isLocalProviderUrl,
  isCodexBaseUrl,
} from '@hawk/eyrie'
```

### Step 3.4: Test Wrapper
```bash
npm run typecheck
npm run build
npm test
```

### Step 3.5: Update Direct Imports (ONE BY ONE)

```typescript
// src/entrypoints/cli.tsx
// BEFORE:
import { resolveProviderRequest } from '../services/api/providerConfig.js'

// AFTER (direct package import):
import { resolveProviderRequest } from '@hawk/eyrie'
```

**Test after each file update!**

### Step 3.6: Verification
```bash
# Run full test suite
npm run hardening:strict

# Test actual functionality
npm run dev -- --version
```

### Step 3.7: Commit
```bash
git add .
git commit -m "Phase 3: Extract providerConfig to eyrie

- Copied providerConfig.ts to eyrie/src/config/
- Updated runtime + script imports to @hawk/eyrie
- Removed src/services/api/providerConfig.ts from hawk
- All tests passing"
```

---

## Phase 4: Extract Error Types (Day 5-6)

**Target:** `src/services/api/errors.ts`, `errorUtils.ts`
**Risk Level:** MEDIUM
**Files to Update:** 5 files

### Step 4.1-4.7: Same pattern as Phase 3
1. Copy files to eyrie
2. Extract dependencies
3. Create wrapper
4. Update imports one by one
5. Test at each step
6. Commit

---

## Phase 5: Extract API Client (Day 6-8)

**Target:** `src/services/api/client.ts`, `openaiShim.ts`, `codexShim.ts`
**Risk Level:** HIGH (core functionality)
**Files to Update:** 3 files

### Step 5.1: Copy Clients
```bash
cp src/services/api/client.ts eyrie/src/client/graycode.ts
cp src/services/api/openaiShim.ts eyrie/src/client/openai.ts
cp src/services/api/codexShim.ts eyrie/src/client/codex.ts
```

### Step 5.2: Extract Dependencies
Move `src/utils/model/providers.ts` utilities to eyrie:
```typescript
// eyrie/src/utils/providers.ts
export function getAPIProvider(model: string): string { ... }
export function isFirstPartyGrayCodeBaseUrl(url: string): boolean { ... }
```

### Step 5.3: Create Wrapper
```typescript
// src/services/api/client.ts
export { createGrayCodeClient } from '../../../eyrie/src/client/graycode.js'
```

### Step 5.4-5.7: Test, update, verify, commit

---

## Phase 6: Extract Remaining Types (Day 8-10)

**Target:** Complete type extraction
**Risk Level:** MEDIUM

### Step 6.1: Identify Remaining Types
```bash
grep -r "from.*types/" src/ --include="*.ts" | grep -v ".test.ts"
```

### Step 6.2: Move Types Incrementally
1. Message types
2. Tool types (base)
3. Permission types (base)
4. Log types

### Step 6.3: Update All Imports
```bash
# Find all files importing from types
find src -name "*.ts" -exec grep -l "from.*types/" {} \;

# Update each one
# Use sed or manual updates
```

### Step 6.4: Massive Verification
```bash
npm run typecheck
npm run build
npm run test:provider
npm run smoke
```

---

## Phase 7: Create eyrie Package (Day 10-12)

### Step 7.1: Make eyrie Independent
```bash
# Move eyrie out of hawk
cd ..
cp -r hawk/eyrie eyrie
cd eyrie
```

### Step 7.2: Set up eyrie Package
```bash
# Update package.json
npm init
npm install @graycode-ai/sdk zod
npm install -D typescript @types/node

# Build
npx tsc --init
npm run build
```

### Step 7.3: Link eyrie to hawk
```bash
cd ../hawk
npm link ../eyrie
```

### Step 7.4: Update hawk Imports
Change all imports from:
```typescript
import { ... } from '../../eyrie/src/...'
```

To:
```typescript
import { ... } from '@hawk/eyrie'
```

### Step 7.5: Final Verification
```bash
rm -rf eyrie/  # Remove embedded eyrie
npm run typecheck
npm run build
npm run test
```

---

## Phase 8: Cleanup (Day 12-13)

### Step 8.1: Remove Wrapper Files
Once all imports updated, remove wrapper files:
```bash
rm src/constants/apiLimits.ts  # Now just imports from eyrie
rm src/services/api/providerConfig.ts  # Duplicate (already removed as of 2026-04-08)
```

### Step 8.2: Clean Build
```bash
npm run build
npm run hardening:strict
```

### Step 8.3: Final Commit
```bash
git add .
git commit -m "Phase 8: Complete eyrie extraction

- eyrie is now independent package
- Removed all wrapper files
- All imports use @hawk/eyrie
- Full test suite passing"
```

---

## Testing Strategy at Each Phase

### Before Starting a Phase
```bash
# Create pre-phase checkpoint
git tag phase-X-start

# Run baseline tests
npm run typecheck 2>&1 | tee tests-before.log
npm run build 2>&1 | tee build-before.log
npm run smoke 2>&1 | tee smoke-before.log
```

### During a Phase
```bash
# After each file change
npm run typecheck
# Fix errors immediately
```

### After Completing a Phase
```bash
# Full test suite
npm run typecheck 2>&1 | tee tests-after.log
diff tests-before.log tests-after.log  # Should be similar

npm run build 2>&1 | tee build-after.log
npm run smoke 2>&1 | tee smoke-after.log

# Functional test
npm run dev -- --version
npm run dev -- --help
```

---

## Rollback Procedures

### If Tests Fail During a Phase
```bash
# Stash current work
git stash

# Checkout last known good state
git checkout phase-X-start

# Or restore from backup
cp -r ../hawk-backup/src/constants/apiLimits.ts src/constants/

# Try again with different approach
```

### If Major Issue Discovered
```bash
# Complete rollback
cd ..
rm -rf hawk/
cp -r hawk-backup/ hawk/
cd hawk

# Start fresh
git checkout main
git checkout -b migration/eyrie-v2
```

### Emergency Hotfix During Migration
```bash
# If production issue while migrating
git checkout main  # Go to stable branch
# Fix issue
git checkout migration/eyrie-extraction
# Cherry-pick fix
git cherry-pick <fix-commit>
```

---

## Verification Checkpoints

### Checkpoint 1: After Phase 1 (Constants)
- [ ] `apiLimits.ts` exists in both locations
- [ ] 8 files import from eyrie
- [ ] All tests pass
- [ ] Build succeeds
- [ ] No functional changes

### Checkpoint 2: After Phase 3 (Providers)
- [x] `providerConfig.ts` extracted to eyrie and removed from hawk
- [ ] CLI can resolve providers
- [ ] All provider tests pass
- [ ] Codex and OpenAI shims work

### Checkpoint 3: After Phase 5 (Clients)
- [ ] API calls work
- [ ] Authentication works
- [ ] Error handling works
- [ ] Retry logic works

### Checkpoint 4: After Phase 7 (Package)
- [ ] eyrie builds independently
- [ ] hawk imports @hawk/eyrie
- [ ] No relative paths to eyrie
- [ ] Both repos have clean git history

### Final Checkpoint
- [ ] All original functionality preserved
- [ ] No references to deleted files
- [ ] Documentation updated
- [ ] CI/CD updated
- [ ] Team notified

---

## Timeline Summary

| Phase | Days | Risk | Files Changed |
|-------|------|------|---------------|
| 0: Setup | 0.5 | Low | 0 |
| 1: Constants | 1 | Low | 8 |
| 2: Types | 1.5 | Medium | 20 |
| 3: Providers | 2 | High | 4 |
| 4: Errors | 1.5 | Medium | 5 |
| 5: Clients | 2 | High | 3 |
| 6: Remaining Types | 2 | Medium | 30 |
| 7: Package | 2 | High | All |
| 8: Cleanup | 1 | Low | Cleanup |
| **Total** | **13.5 days** | | **~70 files** |

---

## Key Success Metrics

1. **Zero regression bugs** in production
2. **All tests pass** at each phase
3. **Build time unchanged** or improved
4. **Bundle size** unchanged or reduced
5. **Type safety** maintained
6. **Clean separation** - eyrie has no hawk imports

---

## Communication Plan

- **Daily updates** in team channel
- **Phase completions** announced
- **Blockers** escalated immediately
- **Final review** before Phase 8
- **Documentation** updated alongside code

---

## Post-Migration

1. Archive `hawk-backup/` after 1 week of stability
2. Monitor error rates for 2 weeks
3. Document lessons learned
4. Share architecture with team
5. Plan eyrie v1.0 release

---

**Remember: If in doubt, keep the original file and create a wrapper. Safety first!**
