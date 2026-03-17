import { shellIntegrationTip } from './messages.js'
import { getRcFilePath } from './setup.js'

export function showTipIfNeeded() {
  if (process.env.CLOAK_SHELL_INTEGRATION === '1') return
  if (process.env.CLOAK_TIP_SHOWN === '1') return
  if (!process.stdout.isTTY) return

  process.stderr.write(shellIntegrationTip(getRcFilePath()))

  process.env.CLOAK_TIP_SHOWN = '1'
}
