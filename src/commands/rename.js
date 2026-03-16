import { renameSync } from 'fs'
import chalk from 'chalk'
import { profileDir, profileExists, getActiveProfile } from '../lib/paths.js'
import { validateAccountName } from '../lib/validate.js'

export async function renameAccount(oldName, newName) {
  const oldValidation = validateAccountName(oldName)
  if (!oldValidation.valid) {
    console.error(chalk.red(`✖ ${oldValidation.error}`))
    process.exit(1)
    return
  }

  const newValidation = validateAccountName(newName)
  if (!newValidation.valid) {
    console.error(chalk.red(`✖ ${newValidation.error}`))
    process.exit(1)
    return
  }

  if (!profileExists(oldName)) {
    console.error(chalk.red(`✖ Account "${oldName}" not found.`))
    process.exit(1)
    return
  }

  if (profileExists(newName)) {
    console.error(chalk.red(`✖ Account "${newName}" is already in use.`))
    process.exit(1)
    return
  }

  renameSync(profileDir(oldName), profileDir(newName))

  if (getActiveProfile() === oldName) {
    console.log(chalk.yellow(`⚠ Run \`claude account switch ${newName}\` to update your session.`))
  }

  console.log(chalk.green(`✔ Cloak "${oldName}" renamed to "${newName}".`))
}
