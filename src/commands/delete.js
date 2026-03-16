import { rmSync } from 'fs'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { profileDir, profileExists, getActiveProfile } from '../lib/paths.js'
import { validateAccountName } from '../lib/validate.js'

export async function deleteAccount(name, options = {}) {
  const validation = validateAccountName(name)
  if (!validation.valid) {
    console.error(chalk.red(`✖ ${validation.error}`))
    process.exit(1)
    return
  }

  if (!profileExists(name)) {
    console.error(chalk.red(`✖ Account "${name}" not found.`))
    process.exit(1)
    return
  }

  if (getActiveProfile() === name) {
    console.error(chalk.red(`✖ Can't discard a cloak you're wearing.`))
    console.log(chalk.dim('  Switch to another account first.'))
    process.exit(1)
    return
  }

  if (options.confirm === false) {
    console.log(chalk.dim('Cancelled.'))
    return
  }

  if (options.confirm === undefined) {
    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: `Delete cloak "${name}"?`,
      default: false,
    }])
    if (!confirm) {
      console.log(chalk.dim('Cancelled.'))
      return
    }
  }

  rmSync(profileDir(name), { recursive: true, force: true })
  console.log(chalk.green(`✔ Cloak "${name}" discarded.`))
}
