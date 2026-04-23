/**
 * Generate TypeScript types from Zod schemas
 *
 * This script is the single source of truth for SDK types.
 * Schemas in coreSchemas.ts and controlSchemas.ts are parsed,
 * and corresponding TypeScript types are generated using z.infer<>.
 *
 * Run: bun scripts/generate-sdk-types.ts
 * Or:  npm run generate:types
 *
 * Industry-standard approach:
 * - Single source of truth (schemas)
 * - Types inferred from schemas at generation time
 * - Generated files committed to version control
 * - Easy to audit and regenerate
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

interface SchemaInfo {
  name: string
  typeName: string
}

function extractSchemaNames(fileContent: string): SchemaInfo[] {
  const pattern = /export\s+const\s+(\w+Schema)\s*=/g
  const schemas: SchemaInfo[] = []
  let match

  while ((match = pattern.exec(fileContent)) !== null) {
    const schemaName = match[1]
    // Convert FooSchema → Foo
    const typeName = schemaName.replace(/Schema$/, '')
    schemas.push({ name: schemaName, typeName })
  }

  return schemas
}

function generateCoreTypesFile(schemas: SchemaInfo[]): string {
  const imports = schemas
    .map(s => `  ${s.name},`)
    .join('\n')

  const typeExports = schemas
    .map(
      s => `export type ${s.typeName} = z.infer<ReturnType<typeof ${s.name}>>`,
    )
    .join('\n')

  return `/**
 * SDK Core Types (Auto-generated)
 *
 * This file is generated from coreSchemas.ts using z.infer<>.
 * Do not edit manually — run: bun scripts/generate-sdk-types.ts
 *
 * Types are inferred directly from Zod schemas, ensuring 100% consistency
 * between runtime validation and TypeScript compile-time types.
 */

import type { z } from 'zod/v4'
import {
${imports}
} from './coreSchemas.js'

// ============================================================================
// Generated Type Exports
// ============================================================================

${typeExports}
`
}

function generateControlTypesFile(schemas: SchemaInfo[]): string {
  const imports = schemas
    .map(s => `  ${s.name},`)
    .join('\n')

  const typeExports = schemas
    .map(
      s => `export type ${s.typeName} = z.infer<ReturnType<typeof ${s.name}>>`,
    )
    .join('\n')

  return `/**
 * SDK Control Protocol Types (Auto-generated)
 *
 * This file is generated from controlSchemas.ts using z.infer<>.
 * Do not edit manually — run: bun scripts/generate-sdk-types.ts
 *
 * Types are inferred directly from Zod schemas, ensuring 100% consistency
 * between runtime validation and TypeScript compile-time types.
 */

import type { z } from 'zod/v4'
import {
${imports}
} from './controlSchemas.js'

// ============================================================================
// Generated Type Exports
// ============================================================================

${typeExports}
`
}

async function main() {
  const projectRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..')
  const sdkDir = join(projectRoot, 'src', 'entrypoints', 'sdk')

  // Read schema files
  console.log('📖 Reading schema files...')
  const coreSchemaFile = readFileSync(join(sdkDir, 'coreSchemas.ts'), 'utf-8')
  const controlSchemaFile = readFileSync(
    join(sdkDir, 'controlSchemas.ts'),
    'utf-8',
  )

  // Extract schema names
  console.log('🔍 Extracting schema definitions...')
  const coreSchemas = extractSchemaNames(coreSchemaFile)
  const controlSchemas = extractSchemaNames(controlSchemaFile)

  console.log(`  ✓ Found ${coreSchemas.length} core schemas`)
  console.log(`  ✓ Found ${controlSchemas.length} control schemas`)

  // Generate type files
  console.log('✏️  Generating type files...')
  const coreTypesPath = join(sdkDir, 'coreTypes.generated.ts')
  const controlTypesPath = join(sdkDir, 'controlTypes.ts')

  mkdirSync(sdkDir, { recursive: true })

  writeFileSync(coreTypesPath, generateCoreTypesFile(coreSchemas), 'utf-8')
  console.log(`  ✓ ${coreTypesPath}`)

  writeFileSync(controlTypesPath, generateControlTypesFile(controlSchemas), 'utf-8')
  console.log(`  ✓ ${controlTypesPath}`)

  // Generate runtimeTypes stub (non-serializable types, defined separately)
  const runtimeTypesPath = join(sdkDir, 'runtimeTypes.ts')
  const runtimeTypes = `/**
 * SDK Runtime Types
 *
 * Non-serializable types used by the SDK runtime (interfaces with methods,
 * callbacks, handlers). These are not generated from schemas since they
 * represent code/behavior, not serializable data.
 *
 * See src/entrypoints/sdk/runtimeTypes.implementation.ts for actual implementations.
 */

// Placeholder - runtime types are defined in their respective modules
export type Options = Record<string, unknown>
export type Query = Record<string, unknown>
export type InternalOptions = Record<string, unknown>
export type InternalQuery = Record<string, unknown>
export type SessionMutationOptions = Record<string, unknown>
export type ForkSessionOptions = Record<string, unknown>
export type ForkSessionResult = Record<string, unknown>
export type GetSessionInfoOptions = Record<string, unknown>
export type GetSessionMessagesOptions = Record<string, unknown>
export type ListSessionsOptions = Record<string, unknown>

export interface SDKSession {
  query(q: Query, opts?: Options): Promise<unknown>
  mutate(input: unknown, opts?: SessionMutationOptions): Promise<unknown>
}

export interface SDKSessionOptions {}

export type AnyZodRawShape = Record<string, unknown>
export type InferShape<T> = unknown

export interface SdkMcpToolDefinition<Schema extends AnyZodRawShape = AnyZodRawShape> {
  name: string
  description?: string
}

export type SessionMessage = Record<string, unknown>
export type McpSdkServerConfigWithInstance = Record<string, unknown>
`

  writeFileSync(runtimeTypesPath, runtimeTypes, 'utf-8')
  console.log(`  ✓ ${runtimeTypesPath}`)

  console.log('')
  console.log('✨ Type generation complete!')
  console.log('')
  console.log('Generated files:')
  console.log(`  • ${coreTypesPath}`)
  console.log(`  • ${controlTypesPath}`)
  console.log(`  • ${runtimeTypesPath}`)
  console.log('')
  console.log('These files are safe to commit — regenerate after schema changes.')
}

main().catch(err => {
  console.error('❌ Type generation failed:', err.message)
  process.exit(1)
})
