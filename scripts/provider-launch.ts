// @ts-nocheck
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  buildLaunchEnv,
  hasLocalOllama,
  isProviderProfile,
  loadProviderProfileConfig,
  resolveProfileRuntime,
  validateProfileRuntime,
  type ProfileFile,
  type ProviderProfile,
} from './provider-profiles.js'

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

    if ((lower === 'auto' || isProviderProfile(lower)) && requestedProfile === 'auto') {
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
  try {
    if (existsSync(path)) {
      const parsed = JSON.parse(readFileSync(path, 'utf8')) as ProfileFile
      return isProviderProfile(parsed.profile) ? parsed : null
    }
  } catch {
    // Fall through to the Herm-style global provider config.
  }
  return loadProviderProfileConfig()
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
  const runtime = resolveProfileRuntime(env)
  const prefix =
    runtime.mode === 'anthropic'
      ? 'ANTHROPIC'
      : runtime.mode === 'grok'
        ? 'GROK'
        : runtime.mode === 'gemini'
          ? 'GEMINI'
          : runtime.mode === 'codex'
            ? 'CODEX'
            : 'OPENAI'

  console.log(`Launching profile: ${profile}`)
  console.log(`OPENAI_BASE_URL=${runtime.request.baseUrl}`)
  console.log(`OPENAI_MODEL=${runtime.request.requestedModel}`)
  console.log(`${prefix}_API_KEY_SET=${Boolean(runtime.apiKey)}`)
  console.log(`${prefix}_API_KEY_SOURCE=${runtime.apiKeySource}`)
  if (runtime.mode === 'codex') {
    console.log(`CODEX_ACCOUNT_ID_SET=${Boolean(runtime.codexCredentials?.accountId)}`)
  }
}

async function main(): Promise<void> {
  const options = parseLaunchOptions(process.argv.slice(2))
  if (!options.requestedProfile) {
    console.error('Usage: bun run scripts/provider-launch.ts [openai|ollama|codex|gemini|anthropic|grok|auto] [--fast] [-- <cli args>]')
    process.exit(1)
  }

  const persisted = loadPersistedProfile()
  const profile =
    options.requestedProfile === 'auto'
      ? persisted?.profile ?? ((await hasLocalOllama()) ? 'ollama' : 'openai')
      : options.requestedProfile

  const env = buildLaunchEnv(profile, persisted)
  if (options.fast) {
    applyFastFlags(env)
  }

  const validationError = validateProfileRuntime(profile, resolveProfileRuntime(env))
  if (validationError) {
    console.error(validationError)
    process.exit(1)
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
