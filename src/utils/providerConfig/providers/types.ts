import type { ProviderConfig } from '../../providerConfig.js'

export type ProviderEnvApplyContext = {
  env: NodeJS.ProcessEnv
  config: ProviderConfig
  activeModel: string | undefined
  overwrite: boolean
}
