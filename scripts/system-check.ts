// @ts-nocheck
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import {
  isOpenAICompatibleRuntimeEnabled,
  isLocalProviderUrl as isProviderLocalUrl,
  resolveOpenAICompatibleRuntime,
} from '@hawk/eyrie'
import { applyProviderConfigToEnv } from '../src/utils/providerConfig.js'

function applyEnvCompat(env: NodeJS.ProcessEnv = process.env): void {
  for (const [key, value] of Object.entries(env)) {
    if (value == null) continue

    if (key.startsWith('GRAYCODE_')) {
      const suffix = key.slice('GRAYCODE_'.length)
      if (!suffix) continue
      const graycodeKey = `GRAYCODE_${suffix}`
      if (env[graycodeKey] == null) {
        env[graycodeKey] = value
      }
      continue
    }

    if (key.startsWith('GRAYCODE_')) {
      const suffix = key.slice('GRAYCODE_'.length)
      if (!suffix) continue
      const grayCodeKey = `GRAYCODE_${suffix}`
      if (env[grayCodeKey] == null) {
        env[grayCodeKey] = value
      }
    }
  }
}

applyEnvCompat()
applyProviderConfigToEnv()

type CheckResult = {
  ok: boolean
  label: string
  detail?: string
}

type CliOptions = {
  json: boolean
  outFile: string | null
}

function pass(label: string, detail?: string): CheckResult {
  return { ok: true, label, detail }
}

function fail(label: string, detail?: string): CheckResult {
  return { ok: false, label, detail }
}

function isTruthy(value: string | undefined): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized !== '' && normalized !== '0' && normalized !== 'false' && normalized !== 'no'
}

function parseOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    json: false,
    outFile: null,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--json') {
      options.json = true
      continue
    }

    if (arg === '--out') {
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) {
        options.outFile = next
        i++
      }
    }
  }

  return options
}

function checkNodeVersion(): CheckResult {
  const raw = process.versions.node
  const major = Number(raw.split('.')[0] ?? '0')
  if (Number.isNaN(major)) {
    return fail('Node.js version', `Could not parse version: ${raw}`)
  }

  if (major < 20) {
    return fail('Node.js version', `Detected ${raw}. Require >= 20.`)
  }

  return pass('Node.js version', raw)
}

function checkBunRuntime(): CheckResult {
  const bunVersion = (globalThis as { Bun?: { version?: string } }).Bun?.version
  if (!bunVersion) {
    return pass('Bun runtime', 'Not running inside Bun (this is acceptable for Node startup).')
  }
  return pass('Bun runtime', bunVersion)
}

function checkBuildArtifacts(): CheckResult {
  const distCli = resolve(process.cwd(), 'dist', 'cli.mjs')
  if (!existsSync(distCli)) {
    return fail('Build artifacts', `Missing ${distCli}. Run: bun run build`)
  }
  return pass('Build artifacts', distCli)
}

function isLocalBaseUrl(baseUrl: string): boolean {
  return isProviderLocalUrl(baseUrl)
}

function resolveRuntime(env: NodeJS.ProcessEnv = process.env) {
  return resolveOpenAICompatibleRuntime({ env })
}

function currentBaseUrl(): string {
  return resolveRuntime().request.baseUrl
}

function checkGeminiEnv(): CheckResult[] {
  const results: CheckResult[] = []
  const runtime = resolveRuntime()
  const model = process.env.GEMINI_MODEL
  const baseUrl = runtime.request.baseUrl

  results.push(pass('Provider mode', 'Google Gemini provider enabled.'))

  if (!model) {
    results.push(pass('GEMINI_MODEL', 'Not set. Default gemini-2.0-flash will be used.'))
  } else {
    results.push(pass('GEMINI_MODEL', model))
  }

  results.push(pass('GEMINI_BASE_URL', baseUrl))

  if (!runtime.apiKey) {
    results.push(fail('GEMINI_API_KEY', 'Missing. Set GEMINI_API_KEY.'))
  } else {
    results.push(pass('GEMINI_API_KEY', 'Configured.'))
  }

  return results
}

function checkOpenAIEnv(): CheckResult[] {
  const results: CheckResult[] = []
  const useGemini = isTruthy(process.env.HAWK_CODE_USE_GEMINI)
  const useOpenAICompat = isOpenAICompatibleRuntimeEnabled()

  if (useGemini) {
    return checkGeminiEnv()
  }

  if (!useOpenAICompat) {
    results.push(pass('Provider mode', 'GrayCode login flow enabled (HAWK_CODE_USE_OPENAI is off).'))
    return results
  }

  const runtime = resolveRuntime()
  const request = runtime.request

  results.push(
    pass(
      'Provider mode',
      runtime.mode === 'anthropic'
        ? 'Anthropic provider enabled.'
        : runtime.mode === 'grok'
          ? 'Grok provider enabled.'
        : 'OpenAI-compatible provider enabled.',
    ),
  )

  if (!process.env.OPENAI_MODEL) {
    results.push(pass('OPENAI_MODEL', 'Not set. Runtime fallback model will be used.'))
  } else {
    results.push(pass('OPENAI_MODEL', process.env.OPENAI_MODEL))
  }

  results.push(pass('OPENAI_BASE_URL', request.baseUrl))

  const key = runtime.apiKey
  if (runtime.mode === 'anthropic') {
    if (key === 'SUA_CHAVE') {
      results.push(fail('ANTHROPIC_API_KEY', 'Placeholder value detected: SUA_CHAVE.'))
    } else if (!key && !isLocalBaseUrl(request.baseUrl)) {
      results.push(fail('ANTHROPIC_API_KEY', 'Missing key for non-local provider URL.'))
    } else if (!key) {
      results.push(pass('ANTHROPIC_API_KEY', 'Not set (allowed for local providers).'))
    } else {
      results.push(pass('ANTHROPIC_API_KEY', 'Configured.'))
    }
    return results
  }

  if (runtime.mode === 'grok') {
    if (key === 'SUA_CHAVE') {
      results.push(fail('GROK_API_KEY', 'Placeholder value detected: SUA_CHAVE.'))
    } else if (!key && !isLocalBaseUrl(request.baseUrl)) {
      results.push(fail('GROK_API_KEY', 'Missing key for non-local provider URL.'))
    } else if (!key) {
      results.push(pass('GROK_API_KEY', 'Not set (allowed for local providers).'))
    } else {
      results.push(pass('GROK_API_KEY', 'Configured.'))
    }
    return results
  }

  if (key === 'SUA_CHAVE') {
    results.push(fail('OPENAI_API_KEY', 'Placeholder value detected: SUA_CHAVE.'))
  } else if (!key && !isLocalBaseUrl(request.baseUrl)) {
    results.push(fail('OPENAI_API_KEY', 'Missing key for non-local provider URL.'))
  } else if (!key) {
    results.push(pass('OPENAI_API_KEY', 'Not set (allowed for local providers like Ollama/LM Studio).'))
  } else {
    results.push(pass('OPENAI_API_KEY', 'Configured.'))
  }

  return results
}

async function checkBaseUrlReachability(): Promise<CheckResult> {
  const useGemini = isTruthy(process.env.HAWK_CODE_USE_GEMINI)
  const useOpenAICompat = isOpenAICompatibleRuntimeEnabled()

  if (!useGemini && !useOpenAICompat) {
    return pass('Provider reachability', 'Skipped (OpenAI-compatible mode disabled).')
  }

  const runtime = resolveRuntime()
  const request = runtime.request
  const endpoint = `${request.baseUrl}/models`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4000)

  try {
    const headers: Record<string, string> = {}
    if (runtime.mode === 'anthropic') {
      if (runtime.apiKey) {
        headers.Authorization = `Bearer ${runtime.apiKey}`
        headers['x-api-key'] = runtime.apiKey
      }
      headers['anthropic-version'] =
        process.env.ANTHROPIC_VERSION?.trim() || '2023-06-01'
    } else if (runtime.apiKey) {
      headers.Authorization = `Bearer ${runtime.apiKey}`
    }

    const response = await fetch(endpoint, {
      method: 'GET',
      headers,
      signal: controller.signal,
    })

    if (response.status === 200 || response.status === 401 || response.status === 403) {
      return pass('Provider reachability', `Reached ${endpoint} (status ${response.status}).`)
    }

    return fail('Provider reachability', `Unexpected status ${response.status} from ${endpoint}.`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return fail('Provider reachability', `Failed to reach ${endpoint}: ${message}`)
  } finally {
    clearTimeout(timeout)
  }
}

function checkOllamaProcessorMode(): CheckResult {
  if (!isOpenAICompatibleRuntimeEnabled()) {
    return pass('Ollama processor mode', 'Skipped (OpenAI-compatible mode disabled).')
  }

  const runtime = resolveRuntime()
  if (runtime.mode !== 'openai') {
    return pass('Ollama processor mode', `Skipped (provider mode is ${runtime.mode}).`)
  }

  const baseUrl = runtime.request.baseUrl
  if (!isLocalBaseUrl(baseUrl)) {
    return pass('Ollama processor mode', 'Skipped (provider URL is not local).')
  }

  const result = spawnSync('ollama', ['ps'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: true,
  })

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || 'Unable to run ollama ps').trim()
    return fail('Ollama processor mode', detail)
  }

  const output = (result.stdout || '').trim()
  if (!output) {
    return fail('Ollama processor mode', 'ollama ps returned empty output.')
  }

  const lines = output.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const modelLine = lines.find(line => line.includes(':') && !line.startsWith('NAME'))
  if (!modelLine) {
    return pass('Ollama processor mode', 'No loaded model found (run a prompt first).')
  }

  if (modelLine.includes('CPU')) {
    return pass('Ollama processor mode', 'Detected CPU mode. This is valid but can be slow for larger models.')
  }

  return pass('Ollama processor mode', `Detected non-CPU mode: ${modelLine}`)
}

function serializeSafeEnvSummary(): Record<string, string | boolean> {
  const runtime = resolveRuntime()

  if (isTruthy(process.env.HAWK_CODE_USE_GEMINI)) {
    return {
      HAWK_CODE_USE_GEMINI: true,
      GEMINI_MODEL: process.env.GEMINI_MODEL ?? '(unset, default: gemini-2.0-flash)',
      GEMINI_BASE_URL: runtime.request.baseUrl,
      GEMINI_API_KEY_SET: Boolean(runtime.apiKey),
    }
  }

  if (runtime.mode === 'anthropic') {
    return {
      HAWK_CODE_USE_OPENAI: isTruthy(process.env.HAWK_CODE_USE_OPENAI),
      HAWK_CODE_USE_ANTHROPIC: isTruthy(process.env.HAWK_CODE_USE_ANTHROPIC),
      ANTHROPIC_MODEL:
        process.env.ANTHROPIC_MODEL ?? process.env.OPENAI_MODEL ?? '(unset)',
      ANTHROPIC_BASE_URL: runtime.request.baseUrl,
      ANTHROPIC_API_KEY_SET: Boolean(runtime.apiKey),
    }
  }

  if (runtime.mode === 'grok') {
    return {
      HAWK_CODE_USE_OPENAI: isTruthy(process.env.HAWK_CODE_USE_OPENAI),
      HAWK_CODE_USE_GROK: isTruthy(process.env.HAWK_CODE_USE_GROK),
      GROK_MODEL:
        process.env.GROK_MODEL ??
        process.env.XAI_MODEL ??
        process.env.OPENAI_MODEL ??
        '(unset)',
      GROK_BASE_URL: runtime.request.baseUrl,
      GROK_API_KEY_SET: Boolean(runtime.apiKey),
    }
  }

  return {
    HAWK_CODE_USE_OPENAI: isTruthy(process.env.HAWK_CODE_USE_OPENAI),
    OPENAI_MODEL: process.env.OPENAI_MODEL ?? '(unset)',
    OPENAI_BASE_URL: runtime.request.baseUrl,
    OPENAI_API_KEY_SET: runtime.mode === 'openai' ? Boolean(runtime.apiKey) : false,
  }
}

function printResults(results: CheckResult[]): void {
  for (const result of results) {
    const icon = result.ok ? 'PASS' : 'FAIL'
    const suffix = result.detail ? ` - ${result.detail}` : ''
    console.log(`[${icon}] ${result.label}${suffix}`)
  }
}

function writeJsonReport(
  options: CliOptions,
  results: CheckResult[],
): void {
  const payload = {
    timestamp: new Date().toISOString(),
    cwd: process.cwd(),
    summary: {
      total: results.length,
      passed: results.filter(result => result.ok).length,
      failed: results.filter(result => !result.ok).length,
    },
    env: serializeSafeEnvSummary(),
    results,
  }

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2))
  }

  if (options.outFile) {
    const outputPath = resolve(process.cwd(), options.outFile)
    mkdirSync(dirname(outputPath), { recursive: true })
    writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8')
    if (!options.json) {
      console.log(`Report written to ${outputPath}`)
    }
  }
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2))
  const results: CheckResult[] = []

  results.push(checkNodeVersion())
  results.push(checkBunRuntime())
  results.push(checkBuildArtifacts())
  results.push(...checkOpenAIEnv())
  results.push(await checkBaseUrlReachability())
  results.push(checkOllamaProcessorMode())

  if (!options.json) {
    printResults(results)
  }

  writeJsonReport(options, results)

  const hasFailure = results.some(result => !result.ok)
  if (hasFailure) {
    process.exitCode = 1
    return
  }

  if (!options.json) {
    console.log('\nRuntime checks completed successfully.')
  }
}

await main()

export {}
