/**
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
  SDKHookCallbackMatcherSchema,
  SDKControlInitializeRequestSchema,
  SDKControlInitializeResponseSchema,
  SDKControlInterruptRequestSchema,
  SDKControlPermissionRequestSchema,
  SDKControlSetPermissionModeRequestSchema,
  SDKControlSetModelRequestSchema,
  SDKControlSetMaxThinkingTokensRequestSchema,
  SDKControlMcpStatusRequestSchema,
  SDKControlMcpStatusResponseSchema,
  SDKControlGetContextUsageRequestSchema,
  SDKControlGetContextUsageResponseSchema,
  SDKControlRewindFilesRequestSchema,
  SDKControlRewindFilesResponseSchema,
  SDKControlCancelAsyncMessageRequestSchema,
  SDKControlCancelAsyncMessageResponseSchema,
  SDKControlSeedReadStateRequestSchema,
  SDKHookCallbackRequestSchema,
  SDKControlMcpMessageRequestSchema,
  SDKControlMcpSetServersRequestSchema,
  SDKControlMcpSetServersResponseSchema,
  SDKControlReloadPluginsRequestSchema,
  SDKControlReloadPluginsResponseSchema,
  SDKControlMcpReconnectRequestSchema,
  SDKControlMcpToggleRequestSchema,
  SDKControlStopTaskRequestSchema,
  SDKControlApplyFlagSettingsRequestSchema,
  SDKControlGetSettingsRequestSchema,
  SDKControlGetSettingsResponseSchema,
  SDKControlElicitationRequestSchema,
  SDKControlElicitationResponseSchema,
  SDKControlRequestInnerSchema,
  SDKControlRequestSchema,
  ControlResponseSchema,
  ControlErrorResponseSchema,
  SDKControlResponseSchema,
  SDKControlCancelRequestSchema,
  SDKKeepAliveMessageSchema,
  SDKUpdateEnvironmentVariablesMessageSchema,
  StdoutMessageSchema,
  StdinMessageSchema,
} from './controlSchemas.js'

// ============================================================================
// Generated Type Exports
// ============================================================================

export type SDKHookCallbackMatcher = z.infer<ReturnType<typeof SDKHookCallbackMatcherSchema>>
export type SDKControlInitializeRequest = z.infer<ReturnType<typeof SDKControlInitializeRequestSchema>>
export type SDKControlInitializeResponse = z.infer<ReturnType<typeof SDKControlInitializeResponseSchema>>
export type SDKControlInterruptRequest = z.infer<ReturnType<typeof SDKControlInterruptRequestSchema>>
export type SDKControlPermissionRequest = z.infer<ReturnType<typeof SDKControlPermissionRequestSchema>>
export type SDKControlSetPermissionModeRequest = z.infer<ReturnType<typeof SDKControlSetPermissionModeRequestSchema>>
export type SDKControlSetModelRequest = z.infer<ReturnType<typeof SDKControlSetModelRequestSchema>>
export type SDKControlSetMaxThinkingTokensRequest = z.infer<ReturnType<typeof SDKControlSetMaxThinkingTokensRequestSchema>>
export type SDKControlMcpStatusRequest = z.infer<ReturnType<typeof SDKControlMcpStatusRequestSchema>>
export type SDKControlMcpStatusResponse = z.infer<ReturnType<typeof SDKControlMcpStatusResponseSchema>>
export type SDKControlGetContextUsageRequest = z.infer<ReturnType<typeof SDKControlGetContextUsageRequestSchema>>
export type SDKControlGetContextUsageResponse = z.infer<ReturnType<typeof SDKControlGetContextUsageResponseSchema>>
export type SDKControlRewindFilesRequest = z.infer<ReturnType<typeof SDKControlRewindFilesRequestSchema>>
export type SDKControlRewindFilesResponse = z.infer<ReturnType<typeof SDKControlRewindFilesResponseSchema>>
export type SDKControlCancelAsyncMessageRequest = z.infer<ReturnType<typeof SDKControlCancelAsyncMessageRequestSchema>>
export type SDKControlCancelAsyncMessageResponse = z.infer<ReturnType<typeof SDKControlCancelAsyncMessageResponseSchema>>
export type SDKControlSeedReadStateRequest = z.infer<ReturnType<typeof SDKControlSeedReadStateRequestSchema>>
export type SDKHookCallbackRequest = z.infer<ReturnType<typeof SDKHookCallbackRequestSchema>>
export type SDKControlMcpMessageRequest = z.infer<ReturnType<typeof SDKControlMcpMessageRequestSchema>>
export type SDKControlMcpSetServersRequest = z.infer<ReturnType<typeof SDKControlMcpSetServersRequestSchema>>
export type SDKControlMcpSetServersResponse = z.infer<ReturnType<typeof SDKControlMcpSetServersResponseSchema>>
export type SDKControlReloadPluginsRequest = z.infer<ReturnType<typeof SDKControlReloadPluginsRequestSchema>>
export type SDKControlReloadPluginsResponse = z.infer<ReturnType<typeof SDKControlReloadPluginsResponseSchema>>
export type SDKControlMcpReconnectRequest = z.infer<ReturnType<typeof SDKControlMcpReconnectRequestSchema>>
export type SDKControlMcpToggleRequest = z.infer<ReturnType<typeof SDKControlMcpToggleRequestSchema>>
export type SDKControlStopTaskRequest = z.infer<ReturnType<typeof SDKControlStopTaskRequestSchema>>
export type SDKControlApplyFlagSettingsRequest = z.infer<ReturnType<typeof SDKControlApplyFlagSettingsRequestSchema>>
export type SDKControlGetSettingsRequest = z.infer<ReturnType<typeof SDKControlGetSettingsRequestSchema>>
export type SDKControlGetSettingsResponse = z.infer<ReturnType<typeof SDKControlGetSettingsResponseSchema>>
export type SDKControlElicitationRequest = z.infer<ReturnType<typeof SDKControlElicitationRequestSchema>>
export type SDKControlElicitationResponse = z.infer<ReturnType<typeof SDKControlElicitationResponseSchema>>
export type SDKControlRequestInner = z.infer<ReturnType<typeof SDKControlRequestInnerSchema>>
export type SDKControlRequest = z.infer<ReturnType<typeof SDKControlRequestSchema>>
export type ControlResponse = z.infer<ReturnType<typeof ControlResponseSchema>>
export type ControlErrorResponse = z.infer<ReturnType<typeof ControlErrorResponseSchema>>
export type SDKControlResponse = z.infer<ReturnType<typeof SDKControlResponseSchema>>
export type SDKControlCancelRequest = z.infer<ReturnType<typeof SDKControlCancelRequestSchema>>
export type SDKKeepAliveMessage = z.infer<ReturnType<typeof SDKKeepAliveMessageSchema>>
export type SDKUpdateEnvironmentVariablesMessage = z.infer<ReturnType<typeof SDKUpdateEnvironmentVariablesMessageSchema>>
export type StdoutMessage = z.infer<ReturnType<typeof StdoutMessageSchema>>
export type StdinMessage = z.infer<ReturnType<typeof StdinMessageSchema>>
