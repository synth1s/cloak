import { renameSync } from 'fs'
import inquirer from 'inquirer'
import { profileDir, profileExists, getActiveProfile } from '../lib/paths.js'
import { validateAccountName } from '../lib/validate.js'
import * as msg from '../lib/messages.js'

export async function renameAccount(oldName, newName, options = {}) {
  const oldValidation = validateAccountName(oldName)
  if (!oldValidation.valid) {
    console.error(msg.validationError(oldValidation.error))
    process.exit(1)
    return
  }

  const newValidation = validateAccountName(newName)
  if (!newValidation.valid) {
    console.error(msg.validationError(newValidation.error))
    process.exit(1)
    return
  }

  if (!profileExists(oldName)) {
    console.error(msg.accountNotFound(oldName))
    process.exit(1)
    return
  }

  if (profileExists(newName)) {
    console.error(msg.accountAlreadyInUse(newName))
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
      message: msg.prompts.renameConfirm(oldName, newName),
      default: true,
    }])
    if (!confirm) {
      console.log(msg.cancelled())
      return
    }
  }

  renameSync(profileDir(oldName), profileDir(newName))

  if (getActiveProfile() === oldName) {
    console.log(msg.updateSessionAfterRename(newName))
  }

  console.log(msg.cloakRenamed(oldName, newName))
}
