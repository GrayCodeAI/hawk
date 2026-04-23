/**
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

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SDKSessionOptions {}

export type AnyZodRawShape = Record<string, unknown>
export type InferShape<T> = unknown

export interface SdkMcpToolDefinition<Schema extends AnyZodRawShape = AnyZodRawShape> {
  name: string
  description?: string
}

export type SessionMessage = Record<string, unknown>
export type McpSdkServerConfigWithInstance = Record<string, unknown>
