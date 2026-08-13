import inquirer from 'inquirer'
import { profileDir, profileExists, getActiveProfile, readProfileEnv } from '../lib/paths.js'
import { validateAccountName } from '../lib/validate.js'
import { getRcFilePath, isAlreadyInstalled, installToRcFile } from '../lib/setup.js'
import * as msg from '../lib/messages.js'

export async function switchAccount(name, options = {}) {
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

  const active = getActiveProfile()
  if (active === name) {
    // Always stderr — stdout is reserved for eval-able output when --print-env
    console.error(msg.alreadyWearing(name))
    return
  }

  const dir = profileDir(name)

  if (options.printEnv) {
    const currentProfile = getActiveProfile()
    const currentEnv = currentProfile ? readProfileEnv(currentProfile) : {}
    const targetEnv = readProfileEnv(name)

    let output = ''
    for (const key of Object.keys(currentEnv)) {
      if (!(key in targetEnv)) output += `unset ${key}\n`
    }
    for (const [key, val] of Object.entries(targetEnv)) {
      const escaped = val
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\$/g, '\\$')
        .replace(/`/g, '\\`')
      output += `export ${key}="${escaped}"\n`
    }
    output += msg.printEnvExport(dir)
    process.stdout.write(output)
    // Confirmation to stderr so it doesn't interfere with eval
    process.stderr.write(msg.cloakSwitched(name) + '\n')
    return
  }

  // No shell integration — prompt user to set it up
  console.log('\n' + msg.switchRequired() + '\n')

  let choice = options.setupChoice
  if (choice === undefined) {
    const answer = await inquirer.prompt([{
      type: 'list',
      name: 'choice',
      message: msg.prompts.setupChoice,
      choices: [
        { name: msg.prompts.setupAuto, value: 'auto' },
        { name: msg.prompts.setupManual, value: 'manual' },
      ],
    }])
    choice = answer.choice
  }

  const rcFile = getRcFilePath()

  if (choice === 'auto') {
    if (!isAlreadyInstalled(rcFile)) {
      installToRcFile(rcFile)
      console.log(msg.shellIntegrationAdded(rcFile))
    } else {
      console.log(msg.alreadyInstalled(rcFile))
    }
    console.log(msg.setupRunCommand(rcFile, name))
  } else {
    console.log(msg.setupManualCommand(rcFile, name))
  }
}
