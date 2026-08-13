import inquirer from 'inquirer'
import { profileDir, profileExists, getActiveProfile, listProfileNames } from '../lib/paths.js'
import { validateAccountName } from '../lib/validate.js'
import { getRcFilePath, isAlreadyInstalled, installToRcFile } from '../lib/setup.js'
import * as msg from '../lib/messages.js'

export async function switchAccount(name, options = {}) {
  // No name given — show an interactive picker of available cloaks.
  if (!name) {
    const names = listProfileNames().sort()
    if (names.length === 0) {
      console.error(msg.noCloaksYet())
      console.error(msg.suggestCreate())
      process.exit(1)
      return
    }

    let choice = options.pickChoice
    if (choice === undefined) {
      const active = getActiveProfile()
      // Render the picker on stderr so stdout stays clean for eval (--print-env).
      const prompt = inquirer.createPromptModule({ output: process.stderr })
      try {
        const answer = await prompt([{
          type: 'list',
          name: 'name',
          message: msg.prompts.switchPick,
          default: active || undefined,
          choices: names.map(n => ({
            name: n === active ? `${n} (current)` : n,
            value: n,
          })),
        }])
        choice = answer.name
      } catch {
        // Picker aborted (Ctrl-C / EOF) — leave stdout empty so eval is a no-op.
        console.error(msg.cancelled())
        return
      }
    }
    name = choice
  }

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
    process.stdout.write(msg.printEnvExport(dir))
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
