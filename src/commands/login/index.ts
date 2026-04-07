import type { Command } from '../../commands.js'
import { hasGrayCodeApiKeyAuth } from '../../utils/auth.js'
import { isEnvTruthy } from '../../utils/envUtils.js'

export default () =>
  ({
    type: 'local-jsx',
    name: 'login',
    description: hasGrayCodeApiKeyAuth()
      ? 'Switch GrayCode accounts'
      : 'Sign in with your GrayCode account',
    isEnabled: () => !isEnvTruthy(process.env.DISABLE_LOGIN_COMMAND),
    load: () => import('./login.js'),
  }) satisfies Command
