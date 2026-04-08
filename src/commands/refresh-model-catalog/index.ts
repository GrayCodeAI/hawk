import type { Command } from '../../commands.js'

const refreshModelCatalog = {
  type: 'local-jsx',
  name: 'refesh-mdeol-catalog',
  aliases: ['refresh-model-catalog'],
  description: 'Force-refresh the provider model catalog and cache',
  load: () => import('./refresh-model-catalog.js'),
} satisfies Command

export default refreshModelCatalog
