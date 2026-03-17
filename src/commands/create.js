import { existsSync, copyFileSync, mkdirSync, chmodSync } from 'fs'
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
import * as msg from '../lib/messages.js'

export async function createAccount(name, options = {}) {
  if (!name) {
    const answer = await inquirer.prompt([{
      type: 'input',
      name: 'accountName',
      message: msg.prompts.accountName,
      validate: (v) => {
        const result = validateAccountName(v.trim())
        return result.valid || result.error
      },
    }])
    name = answer.accountName.trim()
  }

  const validation = validateAccountName(name)
  if (!validation.valid) {
    console.error(msg.validationError(validation.error))
    process.exit(1)
    return
  }

  const authSource = claudeAuthPath()
  if (!existsSync(authSource)) {
    console.error(msg.noActiveSession())
    console.error(msg.loginFirst())
    process.exit(1)
    return
  }

  if (profileExists(name)) {
    if (options.confirm === false) {
      console.log(msg.cancelled())
      return
    }
    if (options.confirm === undefined) {
      const { overwrite } = await inquirer.prompt([{
        type: 'confirm',
        name: 'overwrite',
        message: msg.prompts.overwriteConfirm(name),
        default: false,
      }])
      if (!overwrite) {
        console.log(msg.cancelled())
        return
      }
    }
  }

  ensureProfilesDir()
  const dir = profileDir(name)
  mkdirSync(dir, { recursive: true, mode: 0o700 })

  copyFileSync(authSource, profileAuthPath(name))
  chmodSync(profileAuthPath(name), 0o600)

  const settingsSource = claudeSettingsPath()
  if (existsSync(settingsSource)) {
    copyFileSync(settingsSource, profileSettingsPath(name))
    chmodSync(profileSettingsPath(name), 0o600)
  }

  console.log(msg.cloakCreated(name))
}
