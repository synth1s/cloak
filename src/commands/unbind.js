import { unlinkSync, existsSync } from 'fs'
import { join } from 'path'
import * as msg from '../lib/messages.js'

export async function unbindAccount(dir = process.cwd()) {
  const cloakFile = join(dir, '.cloak')

  if (!existsSync(cloakFile)) {
    console.error(msg.noCloakFile())
    process.exit(1)
    return
  }

  unlinkSync(cloakFile)
  console.log(msg.cloakUnbound())
}
