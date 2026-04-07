// Content for the hawk-api bundled skill.
// Each .md file is inlined as a string at build time via Bun's text loader.

import csharpHawkApi from './hawk-api/csharp/hawk-api.md'
import curlExamples from './hawk-api/curl/examples.md'
import goHawkApi from './hawk-api/go/hawk-api.md'
import javaHawkApi from './hawk-api/java/hawk-api.md'
import phpHawkApi from './hawk-api/php/hawk-api.md'
import pythonAgentSdkPatterns from './hawk-api/python/agent-sdk/patterns.md'
import pythonAgentSdkReadme from './hawk-api/python/agent-sdk/README.md'
import pythonHawkApiBatches from './hawk-api/python/hawk-api/batches.md'
import pythonHawkApiFilesApi from './hawk-api/python/hawk-api/files-api.md'
import pythonHawkApiReadme from './hawk-api/python/hawk-api/README.md'
import pythonHawkApiStreaming from './hawk-api/python/hawk-api/streaming.md'
import pythonHawkApiToolUse from './hawk-api/python/hawk-api/tool-use.md'
import rubyHawkApi from './hawk-api/ruby/hawk-api.md'
import skillPrompt from './hawk-api/SKILL.md'
import sharedErrorCodes from './hawk-api/shared/error-codes.md'
import sharedLiveSources from './hawk-api/shared/live-sources.md'
import sharedModels from './hawk-api/shared/models.md'
import sharedPromptCaching from './hawk-api/shared/prompt-caching.md'
import sharedToolUseConcepts from './hawk-api/shared/tool-use-concepts.md'
import typescriptAgentSdkPatterns from './hawk-api/typescript/agent-sdk/patterns.md'
import typescriptAgentSdkReadme from './hawk-api/typescript/agent-sdk/README.md'
import typescriptHawkApiBatches from './hawk-api/typescript/hawk-api/batches.md'
import typescriptHawkApiFilesApi from './hawk-api/typescript/hawk-api/files-api.md'
import typescriptHawkApiReadme from './hawk-api/typescript/hawk-api/README.md'
import typescriptHawkApiStreaming from './hawk-api/typescript/hawk-api/streaming.md'
import typescriptHawkApiToolUse from './hawk-api/typescript/hawk-api/tool-use.md'

// @[MODEL LAUNCH]: Update the model IDs/names below. These are substituted into {{VAR}}
// placeholders in the .md files at runtime before the skill prompt is sent.
// After updating these constants, manually update the two files that still hardcode models:
//   - hawk-api/SKILL.md (Current Models pricing table)
//   - hawk-api/shared/models.md (full model catalog with legacy versions and alias mappings)
export const SKILL_MODEL_VARS = {
  OPUS_ID: 'hawk-opus-4-6',
  OPUS_NAME: 'Hawk Opus 4.6',
  SONNET_ID: 'hawk-sonnet-4-6',
  SONNET_NAME: 'Hawk Sonnet 4.6',
  HAIKU_ID: 'hawk-haiku-4-5',
  HAIKU_NAME: 'Hawk Haiku 4.5',
  // Previous Sonnet ID — used in "do not append date suffixes" example in SKILL.md.
  PREV_SONNET_ID: 'hawk-sonnet-4-5',
} satisfies Record<string, string>

export const SKILL_PROMPT: string = skillPrompt

export const SKILL_FILES: Record<string, string> = {
  'csharp/hawk-api.md': csharpHawkApi,
  'curl/examples.md': curlExamples,
  'go/hawk-api.md': goHawkApi,
  'java/hawk-api.md': javaHawkApi,
  'php/hawk-api.md': phpHawkApi,
  'python/agent-sdk/README.md': pythonAgentSdkReadme,
  'python/agent-sdk/patterns.md': pythonAgentSdkPatterns,
  'python/hawk-api/README.md': pythonHawkApiReadme,
  'python/hawk-api/batches.md': pythonHawkApiBatches,
  'python/hawk-api/files-api.md': pythonHawkApiFilesApi,
  'python/hawk-api/streaming.md': pythonHawkApiStreaming,
  'python/hawk-api/tool-use.md': pythonHawkApiToolUse,
  'ruby/hawk-api.md': rubyHawkApi,
  'shared/error-codes.md': sharedErrorCodes,
  'shared/live-sources.md': sharedLiveSources,
  'shared/models.md': sharedModels,
  'shared/prompt-caching.md': sharedPromptCaching,
  'shared/tool-use-concepts.md': sharedToolUseConcepts,
  'typescript/agent-sdk/README.md': typescriptAgentSdkReadme,
  'typescript/agent-sdk/patterns.md': typescriptAgentSdkPatterns,
  'typescript/hawk-api/README.md': typescriptHawkApiReadme,
  'typescript/hawk-api/batches.md': typescriptHawkApiBatches,
  'typescript/hawk-api/files-api.md': typescriptHawkApiFilesApi,
  'typescript/hawk-api/streaming.md': typescriptHawkApiStreaming,
  'typescript/hawk-api/tool-use.md': typescriptHawkApiToolUse,
}
