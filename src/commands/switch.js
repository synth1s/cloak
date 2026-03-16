import chalk from 'chalk'
import { profileDir, profileExists, getActiveProfile } from '../lib/paths.js'
import { validateAccountName } from '../lib/validate.js'

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

  if (options.printEnv) {
    process.stdout.write(`export CLAUDE_CONFIG_DIR=${dir}\n`)
    process.stdout.write(`echo "${chalk.green(`✔ Now wearing cloak "${name}".`)}"\n`)
    return
  }

  // Manual instructions (no shell integration)
  console.log(chalk.dim('Run this command to switch:'))
  console.log(`\n  export CLAUDE_CONFIG_DIR=${dir}\n`)
}
