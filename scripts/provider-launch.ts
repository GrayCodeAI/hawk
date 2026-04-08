// @ts-nocheck
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  DEFAULT_CODEX_BASE_URL,
  resolveCodexApiCredentials,
} from '@hawk/eyrie'

type ProviderProfile = 'openai' | 'ollama' | 'codex' | 'gemini'

type ProfileFile = {
  profile: ProviderProfile
  env?: {
    OPENAI_BASE_URL?: string
    OPENAI_MODEL?: string
    OPENAI_API_KEY?: string
    CODEX_API_KEY?: string
    GEMINI_API_KEY?: string
    GEMINI_MODEL?: string
    GEMINI_BASE_URL?: string
  }
}

type LaunchOptions = {
  requestedProfile: ProviderProfile | 'auto' | null
  passthroughArgs: string[]
  fast: boolean
}

function parseLaunchOptions(argv: string[]): LaunchOptions {
  let requestedProfile: ProviderProfile | 'auto' | null = 'auto'
  const passthroughArgs: string[] = []
  let fast = false

  for (const arg of argv) {
    const lower = arg.toLowerCase()
    if (lower === '--fast') {
      fast = true
      continue
    }

    if ((lower === 'auto' || lower === 'openai' || lower === 'ollama' || lower === 'codex' || lower === 'gemini') && requestedProfile === 'auto') {
      requestedProfile = lower as ProviderProfile | 'auto'
      continue
    }

    if (arg.startsWith('--')) {
      passthroughArgs.push(arg)
      continue
    }

    if (requestedProfile === 'auto') {
      requestedProfile = null
      break
    }

    passthroughArgs.push(arg)
  }

  return {
    requestedProfile,
    passthroughArgs,
    fast,
  }
}

function loadPersistedProfile(): ProfileFile | null {
  const path = resolve(process.cwd(), '.hawk-profile.json')
  if (!existsSync(path)) return null
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as ProfileFile
    if (parsed.profile === 'openai' || parsed.profile === 'ollama' || parsed.profile === 'codex' || parsed.profile === 'gemini') {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

async function hasLocalOllama(): Promise<boolean> {
  const endpoint = 'http://localhost:11434/api/tags'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 1200)
  try {
    const response = await fetch(endpoint, { signal: controller.signal })
    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

function runCommand(command: string, env: NodeJS.ProcessEnv): Promise<number> {
  return new Promise(resolve => {
    const child = spawn(command, {
      cwd: process.cwd(),
      env,
      stdio: 'inherit',
      shell: true,
    })

    child.on('close', code => resolve(code ?? 1))
    child.on('error', () => resolve(1))
  })
}

function buildEnv(profile: ProviderProfile, persisted: ProfileFile | null): NodeJS.ProcessEnv {
  const persistedEnv = persisted?.env ?? {}

  if (profile === 'gemini') {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      HAWK_CODE_USE_GEMINI: '1',
    }
    delete env.HAWK_CODE_USE_OPENAI
    env.GEMINI_MODEL = process.env.GEMINI_MODEL || persistedEnv.GEMINI_MODEL || 'gemini-2.0-flash'
    env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || persistedEnv.GEMINI_API_KEY
    if (persistedEnv.GEMINI_BASE_URL || process.env.GEMINI_BASE_URL) {
      env.GEMINI_BASE_URL = process.env.GEMINI_BASE_URL || persistedEnv.GEMINI_BASE_URL
    }
    return env
  }

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    HAWK_CODE_USE_OPENAI: '1',
  }

  if (profile === 'ollama') {
    env.OPENAI_BASE_URL = persistedEnv.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'http://localhost:11434/v1'
    env.OPENAI_MODEL = persistedEnv.OPENAI_MODEL || process.env.OPENAI_MODEL || 'llama3.1:8b'
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'SUA_CHAVE') {
      delete env.OPENAI_API_KEY
    }
    return env
  }

  if (profile === 'codex') {
    env.OPENAI_BASE_URL =
      process.env.OPENAI_BASE_URL ||
      persistedEnv.OPENAI_BASE_URL ||
      DEFAULT_CODEX_BASE_URL
    env.OPENAI_MODEL =
      process.env.OPENAI_MODEL ||
      persistedEnv.OPENAI_MODEL ||
      'codexplan'
    env.CODEX_API_KEY =
      process.env.CODEX_API_KEY || persistedEnv.CODEX_API_KEY
    return env
  }

  env.OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || persistedEnv.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  env.OPENAI_MODEL = process.env.OPENAI_MODEL || persistedEnv.OPENAI_MODEL || 'gpt-4o'
  env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || persistedEnv.OPENAI_API_KEY
  return env
}

function applyFastFlags(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  env.HAWK_CODE_SIMPLE ??= '1'
  env.HAWK_CODE_DISABLE_THINKING ??= '1'
  env.DISABLE_INTERLEAVED_THINKING ??= '1'
  env.DISABLE_AUTO_COMPACT ??= '1'
  env.HAWK_CODE_DISABLE_AUTO_MEMORY ??= '1'
  env.HAWK_CODE_DISABLE_BACKGROUND_TASKS ??= '1'
  return env
}

function quoteArg(arg: string): string {
  if (!arg.includes(' ') && !arg.includes('"')) return arg
  return `"${arg.replace(/"/g, '\\"')}"`
}

function printSummary(profile: ProviderProfile, env: NodeJS.ProcessEnv): void {
  console.log(`Launching profile: ${profile}`)
  if (profile === 'gemini') {
    console.log(`GEMINI_MODEL=${env.GEMINI_MODEL}`)
    console.log(`GEMINI_API_KEY_SET=${Boolean(env.GEMINI_API_KEY)}`)
  } else if (profile === 'codex') {
    console.log(`OPENAI_BASE_URL=${env.OPENAI_BASE_URL}`)
    console.log(`OPENAI_MODEL=${env.OPENAI_MODEL}`)
    console.log(`CODEX_API_KEY_SET=${Boolean(resolveCodexApiCredentials(env).apiKey)}`)
  } else {
    console.log(`OPENAI_BASE_URL=${env.OPENAI_BASE_URL}`)
    console.log(`OPENAI_MODEL=${env.OPENAI_MODEL}`)
    console.log(`OPENAI_API_KEY_SET=${Boolean(env.OPENAI_API_KEY)}`)
  }
}

async function main(): Promise<void> {
  const options = parseLaunchOptions(process.argv.slice(2))
  const requestedProfile = options.requestedProfile
  if (!requestedProfile) {
    console.error('Usage: bun run scripts/provider-launch.ts [openai|ollama|codex|gemini|auto] [--fast] [-- <cli args>]')
    process.exit(1)
  }

  const persisted = loadPersistedProfile()
  let profile: ProviderProfile

  if (requestedProfile === 'auto') {
    if (persisted) {
      profile = persisted.profile
    } else {
      profile = (await hasLocalOllama()) ? 'ollama' : 'openai'
    }
  } else {
    profile = requestedProfile
  }

  const env = buildEnv(profile, persisted)
  if (options.fast) {
    applyFastFlags(env)
  }

  if (profile === 'gemini' && !env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is required for gemini profile. Run: bun run profile:init -- --provider gemini --api-key <key>')
    process.exit(1)
  }

  if (profile === 'openai' && (!env.OPENAI_API_KEY || env.OPENAI_API_KEY === 'SUA_CHAVE')) {
    console.error('OPENAI_API_KEY is required for openai profile and cannot be SUA_CHAVE. Run: bun run profile:init -- --provider openai --api-key <key>')
    process.exit(1)
  }

  if (profile === 'codex') {
    const credentials = resolveCodexApiCredentials(env)
    if (!credentials.apiKey) {
      const authHint = credentials.authPath
        ? ` or make sure ${credentials.authPath} exists`
        : ''
      console.error(`CODEX_API_KEY is required for codex profile${authHint}. Run: bun run profile:init -- --provider codex --model codexplan`)
      process.exit(1)
    }
  }

  printSummary(profile, env)

  const doctorCode = await runCommand('bun run scripts/system-check.ts', env)
  if (doctorCode !== 0) {
    console.error('Runtime doctor failed. Fix configuration before launching.')
    process.exit(doctorCode)
  }

  const cliArgs = options.passthroughArgs.map(quoteArg).join(' ')
  const devCommand = cliArgs ? `bun run dev -- ${cliArgs}` : 'bun run dev'
  const devCode = await runCommand(devCommand, env)
  process.exit(devCode)
}

await main()

export {}
