import { rmSync } from 'fs'
import inquirer from 'inquirer'
import { profileDir, profileExists, getActiveProfile } from '../lib/paths.js'
import { validateAccountName } from '../lib/validate.js'
import * as msg from '../lib/messages.js'

export async function deleteAccount(name, options = {}) {
  const validation = validateAccountName(name)
  if (!validation.valid) {
    console.error(msg.validationError(validation.error))
    process.exit(1)
    return
  }

  if (!profileExists(name)) {
    console.error(msg.accountNotFound(name))
    process.exit(1)
    return
  }

  if (getActiveProfile() === name) {
    console.error(msg.cannotDiscardActive())
    console.error(msg.suggestSwitchFirst())
    process.exit(1)
    return
  }

  if (options.confirm === false) {
    console.log(msg.cancelled())
    return
  }

  if (options.confirm === undefined) {
    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: msg.prompts.deleteConfirm(name),
      default: false,
    }])
    if (!confirm) {
      console.log(msg.cancelled())
      return
    }
  }

  rmSync(profileDir(name), { recursive: true, force: true })
  console.log(msg.cloakDiscarded(name))
}
