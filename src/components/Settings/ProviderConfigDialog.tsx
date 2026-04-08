import {
  DEFAULT_ANTHROPIC_OPENAI_BASE_URL,
  DEFAULT_GEMINI_OPENAI_BASE_URL,
  DEFAULT_GROK_OPENAI_BASE_URL,
  DEFAULT_OPENAI_BASE_URL,
} from '@hawk/eyrie'
import React, { useState } from 'react'
import figures from 'figures'
import { Box, Text } from '../../ink.js'
import { useKeybinding } from '../../keybindings/useKeybinding.js'
import {
  getProviderConfigPath,
  loadProviderConfig,
  saveProviderConfig,
  applyProviderConfigToEnv,
  defaultProviderFromConfig,
  getProviderActiveModel,
  type ProviderConfig,
  type ProviderProfile,
} from '../../utils/providerConfig.js'
import { Select } from '../CustomSelect/index.js'
import TextInput from '../TextInput.js'

type Props = {
  onComplete: (summary: string) => void
  onCancel: () => void
}

type Step = 'provider' | 'apiKey' | 'model' | 'baseUrl'

const PROVIDERS: ProviderProfile[] = [
  'anthropic',
  'openai',
  'grok',
  'gemini',
  'ollama',
]

const DEFAULT_MODELS: Record<ProviderProfile, string> = {
  anthropic: 'claude-3-5-sonnet-latest',
  openai: 'gpt-4o',
  grok: 'grok-2',
  gemini: 'gemini-2.0-flash',
  ollama: 'llama3.1:8b',
}

const DEFAULT_BASE_URLS: Record<ProviderProfile, string> = {
  anthropic: DEFAULT_ANTHROPIC_OPENAI_BASE_URL,
  openai: DEFAULT_OPENAI_BASE_URL,
  grok: DEFAULT_GROK_OPENAI_BASE_URL,
  gemini: DEFAULT_GEMINI_OPENAI_BASE_URL,
  ollama: 'http://localhost:11434',
}

function existingApiKey(config: ProviderConfig | null, provider: ProviderProfile): string {
  if (!config) return ''
  switch (provider) {
    case 'anthropic':
      return config.anthropic_api_key ?? ''
    case 'openai':
      return config.openai_api_key ?? ''
    case 'grok':
      return config.grok_api_key ?? config.xai_api_key ?? ''
    case 'gemini':
      return config.gemini_api_key ?? config.google_api_key ?? ''
    case 'ollama':
      return ''
  }
}

function existingBaseUrl(config: ProviderConfig | null, provider: ProviderProfile): string {
  if (!config) return DEFAULT_BASE_URLS[provider]
  switch (provider) {
    case 'anthropic':
      return config.anthropic_base_url ?? DEFAULT_BASE_URLS[provider]
    case 'openai':
      return config.openai_base_url ?? DEFAULT_BASE_URLS[provider]
    case 'grok':
      return config.grok_base_url ?? config.xai_base_url ?? DEFAULT_BASE_URLS[provider]
    case 'gemini':
      return config.gemini_base_url ?? DEFAULT_BASE_URLS[provider]
    case 'ollama':
      return config.ollama_base_url ?? DEFAULT_BASE_URLS[provider]
  }
}

function existingModel(config: ProviderConfig | null, provider: ProviderProfile): string {
  if (!config) return DEFAULT_MODELS[provider]
  return getProviderActiveModel(config, provider) ?? DEFAULT_MODELS[provider]
}

function applyProviderSelection(
  config: ProviderConfig,
  provider: ProviderProfile,
  apiKey: string,
  model: string,
  baseUrl: string,
): ProviderConfig {
  const key = apiKey.trim()
  const trimmedModel = model.trim()
  const trimmedBaseUrl = baseUrl.trim()

  const next: ProviderConfig = {
    ...config,
  }

  switch (provider) {
    case 'anthropic':
      if (key) next.anthropic_api_key = key
      next.anthropic_model = trimmedModel || DEFAULT_MODELS[provider]
      next.anthropic_base_url = trimmedBaseUrl || DEFAULT_BASE_URLS[provider]
      break
    case 'openai':
      if (key) next.openai_api_key = key
      next.openai_model = trimmedModel || DEFAULT_MODELS[provider]
      next.openai_base_url = trimmedBaseUrl || DEFAULT_BASE_URLS[provider]
      break
    case 'grok':
      if (key) next.grok_api_key = key
      next.grok_model = trimmedModel || DEFAULT_MODELS[provider]
      next.grok_base_url = trimmedBaseUrl || DEFAULT_BASE_URLS[provider]
      break
    case 'gemini':
      if (key) next.gemini_api_key = key
      next.gemini_model = trimmedModel || DEFAULT_MODELS[provider]
      next.gemini_base_url = trimmedBaseUrl || DEFAULT_BASE_URLS[provider]
      break
    case 'ollama':
      next.ollama_model = trimmedModel || DEFAULT_MODELS[provider]
      next.ollama_base_url = (trimmedBaseUrl || DEFAULT_BASE_URLS[provider]).replace(/\/v1\/?$/, '')
      break
  }

  return next
}

export function providerLabel(provider: ProviderProfile): string {
  switch (provider) {
    case 'anthropic':
      return 'Anthropic'
    case 'openai':
      return 'OpenAI'
    case 'grok':
      return 'Grok / xAI'
    case 'gemini':
      return 'Gemini'
    case 'ollama':
      return 'Ollama'
  }
}

export function ProviderConfigDialog({ onComplete, onCancel }: Props): React.ReactNode {
  const [config] = useState(() => loadProviderConfig())
  const initialProvider = defaultProviderFromConfig(config) ?? 'anthropic'
  const [step, setStep] = useState<Step>('provider')
  const [provider, setProvider] = useState<ProviderProfile>(initialProvider)
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState(DEFAULT_MODELS.anthropic)
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URLS.anthropic)
  const [cursorOffset, setCursorOffset] = useState(0)

  useKeybinding('confirm:no', onCancel, { context: 'Settings' })

  function resetCursor(value: string): void {
    setCursorOffset(value.length)
  }

  function selectProvider(nextProvider: ProviderProfile): void {
    const nextKey = existingApiKey(config, nextProvider)
    const nextModel = existingModel(config, nextProvider)
    const nextBaseUrl = existingBaseUrl(config, nextProvider)

    setProvider(nextProvider)
    setApiKey(nextKey)
    setModel(nextModel)
    setBaseUrl(nextBaseUrl)

    if (nextProvider === 'ollama') {
      setStep('model')
      resetCursor(nextModel)
    } else {
      setStep('apiKey')
      resetCursor(nextKey)
    }
  }

  function save(): void {
    const nextConfig = applyProviderSelection(
      config ?? {},
      provider,
      apiKey,
      model,
      baseUrl,
    )
    saveProviderConfig(nextConfig)
    applyProviderConfigToEnv()
    onComplete(
      `Configured ${providerLabel(provider)} provider in ${getProviderConfigPath()}`,
    )
  }

  if (step === 'provider') {
    return <Box flexDirection="column" gap={1}>
      <Text>Choose provider API configuration:</Text>
      <Select
        options={PROVIDERS.map(value => ({
          label: providerLabel(value),
          value,
          description: value === 'ollama' ? 'local server, no API key' : undefined,
        }))}
        defaultValue={provider}
        defaultFocusValue={provider}
        onChange={selectProvider}
        onCancel={onCancel}
      />
    </Box>
  }

  if (step === 'apiKey') {
    return <Box flexDirection="column" gap={1}>
      <Text>{providerLabel(provider)} API key:</Text>
      <Box flexDirection="row" gap={1}>
        <Text>{figures.pointer}</Text>
        <TextInput
          value={apiKey}
          onChange={value => {
            setApiKey(value)
            setCursorOffset(value.length)
          }}
          onSubmit={() => {
            setStep('model')
            resetCursor(model)
          }}
          focus
          showCursor
          mask="*"
          placeholder="Paste provider API key"
          columns={72}
          cursorOffset={cursorOffset}
          onChangeCursorOffset={setCursorOffset}
        />
      </Box>
      <Text dimColor>Stored locally in ~/.hawk/provider.json. Leave unchanged to keep the existing key.</Text>
    </Box>
  }

  if (step === 'model') {
    return <Box flexDirection="column" gap={1}>
      <Text>{providerLabel(provider)} model:</Text>
      <Box flexDirection="row" gap={1}>
        <Text>{figures.pointer}</Text>
        <TextInput
          value={model}
          onChange={value => {
            setModel(value)
            setCursorOffset(value.length)
          }}
          onSubmit={() => {
            setStep('baseUrl')
            resetCursor(baseUrl)
          }}
          focus
          showCursor
          placeholder={DEFAULT_MODELS[provider]}
          columns={72}
          cursorOffset={cursorOffset}
          onChangeCursorOffset={setCursorOffset}
        />
      </Box>
    </Box>
  }

  return <Box flexDirection="column" gap={1}>
    <Text>{providerLabel(provider)} base URL:</Text>
    <Box flexDirection="row" gap={1}>
      <Text>{figures.pointer}</Text>
      <TextInput
        value={baseUrl}
        onChange={value => {
          setBaseUrl(value)
          setCursorOffset(value.length)
        }}
        onSubmit={save}
        focus
        showCursor
        placeholder={DEFAULT_BASE_URLS[provider]}
        columns={72}
        cursorOffset={cursorOffset}
        onChangeCursorOffset={setCursorOffset}
      />
    </Box>
    <Text dimColor>Press Enter to save. Esc cancels.</Text>
  </Box>
}
