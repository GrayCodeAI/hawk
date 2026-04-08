// @ts-nocheck
import {
  createProfileEnv,
  hasLocalOllama,
  isProviderProfile,
  profileKeyLabel,
  resolveProfileRuntime,
  saveProviderProfileConfig,
  validateProfileRuntime,
  type ProviderProfile,
} from './provider-profiles.js'

function parseArg(name: string): string | null {
  const args = process.argv.slice(2)
  const idx = args.indexOf(name)
  if (idx === -1) return null
  return args[idx + 1] ?? null
}

function parseProviderArg(): ProviderProfile | 'auto' {
  const provider = parseArg('--provider')?.toLowerCase()
  return isProviderProfile(provider) ? provider : 'auto'
}

async function main(): Promise<void> {
  const provider = parseProviderArg()
  const selected =
    provider === 'auto'
      ? (await hasLocalOllama())
        ? 'ollama'
        : 'openai'
      : provider

  const env = createProfileEnv(selected, {
    model: parseArg('--model'),
    baseUrl: parseArg('--base-url'),
    apiKey: parseArg('--api-key'),
    anthropicVersion: parseArg('--anthropic-version'),
  })

  const runtime = resolveProfileRuntime({
    ...process.env,
    HAWK_CODE_USE_OPENAI: '1',
    ...(selected === 'anthropic' ? { HAWK_CODE_USE_ANTHROPIC: '1' } : {}),
    ...(selected === 'grok' ? { HAWK_CODE_USE_GROK: '1' } : {}),
    ...(selected === 'gemini' ? { HAWK_CODE_USE_GEMINI: '1' } : {}),
    ...env,
  } as NodeJS.ProcessEnv)
  const validationError = validateProfileRuntime(selected, runtime)
  if (validationError) {
    console.error(validationError)
    if (selected === 'gemini') {
      console.error('Get a free key at: https://aistudio.google.com/apikey')
    } else if (selected !== 'ollama') {
      console.error(`Set ${profileKeyLabel(selected)} with --api-key or an environment variable.`)
    }
    process.exit(1)
  }

  const outputPath = saveProviderProfileConfig(selected, env)

  console.log(`Saved profile: ${selected}`)
  console.log(`Path: ${outputPath}`)
  console.log('Next: node dist/cli.mjs')
}

await main()

export {}
