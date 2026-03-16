import { existsSync, copyFileSync, mkdirSync } from 'fs'
import chalk from 'chalk'
import inquirer from 'inquirer'
import {
  claudeAuthPath,
  claudeSettingsPath,
  profileDir,
  profileAuthPath,
  profileSettingsPath,
  profileExists,
  ensureProfilesDir,
} from '../lib/paths.js'
import { validateAccountName } from '../lib/validate.js'

export async function createAccount(name, options = {}) {
  // Interactive prompt if no name given
  if (!name) {
    const answer = await inquirer.prompt([{
      type: 'input',
      name: 'accountName',
      message: 'Account name:',
      validate: (v) => {
        const result = validateAccountName(v.trim())
        return result.valid || result.error
      },
    }])
    name = answer.accountName.trim()
  }

  const validation = validateAccountName(name)
  if (!validation.valid) {
    console.error(chalk.red(`✖ ${validation.error}`))
    process.exit(1)
    return
  }

  const authSource = claudeAuthPath()
  if (!existsSync(authSource)) {
    console.error(chalk.red('✖ No active Claude Code session found.'))
    console.log(chalk.dim('  Open Claude Code and log in first.'))
    process.exit(1)
    return
  }

  if (profileExists(name)) {
    if (options.confirm === false) {
      console.log(chalk.dim('Cancelled.'))
      return
    }
    if (options.confirm === undefined) {
      const { overwrite } = await inquirer.prompt([{
        type: 'confirm',
        name: 'overwrite',
        message: `Cloak "${name}" already exists. Overwrite?`,
        default: false,
      }])
      if (!overwrite) {
        console.log(chalk.dim('Cancelled.'))
        return
      }
    }
    // options.confirm === true → proceed
  }

  ensureProfilesDir()
  const dir = profileDir(name)
  mkdirSync(dir, { recursive: true })

  copyFileSync(authSource, profileAuthPath(name))

  const settingsSource = claudeSettingsPath()
  if (existsSync(settingsSource)) {
    copyFileSync(settingsSource, profileSettingsPath(name))
  }

  console.log(chalk.green(`✔ Cloak "${name}" created.`))
}
