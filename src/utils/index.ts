/**
 * Barrel exports for utility modules
 * Centralized imports for cleaner code
 */

// Array utilities
export { intersperse, count, uniq } from './array.js'

// Set utilities
export { difference, intersects, every, union } from './set.js'

// Path utilities
export { expandPath, toRelativePath, getDirectoryForPath, containsPathTraversal, sanitizePath, normalizePathForConfigKey } from './path.js'

// Environment utilities
export { getHawkConfigHomeDir, isEnvTruthy, isEnvDefinedFalsy, isProviderApiModeEnabled, isBareMode, parseEnvVars, getAWSRegion, getDefaultVertexRegion, shouldMaintainProjectWorkingDir, isRunningOnHomespace, isInProtectedNamespace } from './envUtils.js'

// Error utilities
export { HawkError, MalformedCommandError, AbortError, isAbortError, ConfigParseError, ShellError, TeleportOperationError, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, hasExactErrorMessage, toError, errorMessage, getErrnoCode, isENOENT, getErrnoPath, isFsInaccessible, shortErrorStack, classifyAxiosError } from './errors.js'

// JSON utilities
export { safeParseJSON, safeParseJSONC, parseJSONL, readJSONLFile, addItemToJSONCArray } from './json.js'

// Security utilities
export { sanitizeString, sanitizeObject, sanitizeForLogging, sanitizeError, sanitizeUrl, sanitizeHeaders } from './security/sanitize.js'

// Memoization utilities
export { memoize, memoizeWithKey, memoizeWithTTL, memoizeAsync, once, memoizeWithTTLAsync, memoizeWithLRU } from './memoize.js'

// Promise utilities
export { withResolvers } from './withResolvers.js'

// CWD utilities
export { getCwd } from './cwd.js'

// File reading utilities
export { readFileInRange } from './readFileInRange.js'

// Platform utilities
export { getPlatform } from './platform.js'

// String utilities
export { truncate } from './truncate.js'

// UUID utilities
export { randomUUID } from 'crypto'

// Logging utilities
export { logError, logForDebugging, logForDiagnosticsNoPII } from './log.js'

// Config utilities
export { getGlobalConfig } from './config.js'

// Shell utilities
export { getShell } from './Shell.js'

// Process utilities
export { execFileNoThrow } from './execFileNoThrow.js'

// Filesystem utilities
export { getFsImplementation, safeResolvePath } from './fsOperations.js'

// Model utilities
export { getCanonicalName, getModelCapability, getOpenAIContextWindow, getOpenAIMaxOutputTokens, getAPIProvider, getProviderCatalogEntry } from './model/model.js'

// Context utilities
export { getContextWindowForModel, MODEL_CONTEXT_WINDOW_DEFAULT, COMPACT_MAX_OUTPUT_TOKENS, CAPPED_DEFAULT_MAX_TOKENS, ESCALATED_MAX_TOKENS, is1mContextDisabled, has1mContext, modelSupports1M } from './context.js'

// Settings utilities
export { parseSettingsFile, loadManagedFileSettings, getManagedFileSettingsPresence } from './settings/settings.js'

// Plugin utilities
export { loadAllPluginsCacheOnly, performStartupChecks } from './plugins/pluginLoader.js'

// Message utilities
export { normalizeMessagesForAPI, createAssistantAPIErrorMessage, createUserMessage, ensureToolResultPairing, normalizeContentFromAPI, stripAdvisorBlocks, stripCallerFieldFromAssistantMessage, stripToolReferenceBlocksFromUserMessage } from './messages.js'

// Fast mode utilities
export { isFastModeAvailable, isFastModeCooldown, isFastModeEnabled, isFastModeSupportedByModel, getFastModeState } from './fastMode.js'

// Async utilities
export { returnValue } from './generators.js'

// Type utilities
export type { NonNullableUsage } from '../services/api/logging.js'
export type { Message } from '../types/message.js'
export type { Tool, Tools, ToolUseContext } from '../Tool.js'
export type { MCPServerConnection } from '../services/mcp/types.js'
export type { AppState } from '../state/AppState.js'
export type { AgentDefinition } from '../tools/AgentTool/loadAgentsDir.js'
export type { OrphanedPermission } from '../types/textInputTypes.js'
export type { FileStateCache } from './fileStateCache.js'
export type { AttributionState } from './commitAttribution.js'
