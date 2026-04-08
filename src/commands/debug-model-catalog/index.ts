import type { Command } from '../../commands.js'

const debugModelCatalog = {
  type: 'local-jsx',
  name: 'debug-model-catalog',
  description:
    'Show provider model-catalog source, timestamp, cache path, and counts',
  load: () => import('./debug-model-catalog.js'),
} satisfies Command

export default debugModelCatalog
