import { writeFileSync } from 'fs'
import { join } from 'path'
import { profileExists } from '../lib/paths.js'
import { validateAccountName } from '../lib/validate.js'
import * as msg from '../lib/messages.js'

export async function bindAccount(name, dir = process.cwd()) {
  const validation = validateAccountName(name)
  if (!validation.valid) {
    console.error(msg.validationError(validation.error))
    process.exit(1)
    return
  }

  if (!profileExists(name)) {
    console.error(msg.accountNotFound(name))
    console.error(msg.suggestCreate(name))
    process.exit(1)
    return
  }

  writeFileSync(join(dir, '.cloak'), name + '\n')
  console.log(msg.cloakBound(name))
}
