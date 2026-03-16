import chalk from 'chalk'
import inquirer from 'inquirer'
import { profileDir, profileExists, getActiveProfile } from '../lib/paths.js'
import { validateAccountName } from '../lib/validate.js'
import { getRcFilePath, isAlreadyInstalled, installToRcFile } from '../lib/setup.js'

export async function switchAccount(name, options = {}) {
  const validation = validateAccountName(name)
  if (!validation.valid) {
    console.error(chalk.red(`✖ ${validation.error}`))
    process.exit(1)
    return
  }

  if (!profileExists(name)) {
    console.error(chalk.red(`✖ Account "${name}" not found.`))
    console.log(chalk.dim(`  Run: claude account create ${name}`))
    process.exit(1)
    return
  }

  const active = getActiveProfile()
  if (active === name) {
    console.log(chalk.yellow(`⚡ Already wearing cloak "${name}".`))
    return
  }

  const dir = profileDir(name)

  // Shell integration is active — output for eval
  if (options.printEnv) {
    process.stdout.write(`export CLAUDE_CONFIG_DIR=${dir}\n`)
    process.stdout.write(`echo "${chalk.green(`✔ Now wearing cloak "${name}".`)}"\n`)
    return
  }

  // No shell integration — prompt user to set it up
  console.log(chalk.yellow('\n⚠ Shell integration is required to switch accounts.\n'))

  let choice = options.setupChoice
  if (choice === undefined) {
    const answer = await inquirer.prompt([{
      type: 'list',
      name: 'choice',
      message: 'How would you like to proceed?',
      choices: [
        { name: 'Set it up now (recommended)', value: 'auto' },
        { name: 'Show manual instructions', value: 'manual' },
      ],
    }])
    choice = answer.choice
  }

  if (choice === 'auto') {
    const rcFile = getRcFilePath()
    if (!isAlreadyInstalled(rcFile)) {
      installToRcFile(rcFile)
      console.log(chalk.green(`✔ Shell integration added to ${rcFile}`))
    } else {
      console.log(chalk.dim(`  Already installed in ${rcFile}`))
    }
    console.log(chalk.dim(`\n  Reload your shell to activate:`))
    console.log(chalk.dim(`    source ${rcFile}\n`))
    console.log(chalk.dim(`  Then run:`))
    console.log(chalk.dim(`    claude account switch ${name}\n`))
  } else {
    console.log(chalk.dim('\n  Add this to your shell config:'))
    console.log(`    eval "$(cloak init)"`)
    console.log(chalk.dim('\n  Then reload and run:'))
    console.log(chalk.dim(`    claude account switch ${name}\n`))
  }
}
