#!/usr/bin/env node

import { program } from 'commander'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

import { showTipIfNeeded } from './lib/tip.js'
import { renderContextBar } from './lib/context-bar.js'
import { createAccount } from './commands/create.js'
import { switchAccount } from './commands/switch.js'
import { listAccounts } from './commands/list.js'
import { deleteAccount } from './commands/delete.js'
import { whoami } from './commands/whoami.js'
import { renameAccount } from './commands/rename.js'
import { bindAccount } from './commands/bind.js'
import { unbindAccount } from './commands/unbind.js'
import { addProvider } from './commands/provider.js'
import { initShell } from './commands/init.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'))

showTipIfNeeded()

// Extract --print-env before commander parses (internal flag, not user-facing)
const _printEnv = process.argv.includes('--print-env')
const argv = process.argv.filter(a => a !== '--print-env')

program
  .name('cloak')
  .description('Cloak your Claude. Switch identities in seconds.')
  .version(pkg.version)
  .addHelpText('after', `
Quick start:
  cloak create work              Save your current Claude session
  cloak create home              Save another session
  cloak switch work              Switch to a cloak
  cloak list                     See all your cloaks

Use another model provider:
  cloak provider glm             Add a GLM cloak (also: dashscope, kimi, deepseek)
  cloak provider mine -u <url>   Add any Anthropic-compatible endpoint
  cloak switch glm               Wear it — claude now talks to that provider

Auto-switch by directory:
  cloak bind work                Bind current directory to a cloak
  cd ~/project && claude         Auto-uses the bound cloak

Shell integration (recommended):
  eval "$(cloak init)"           Add to .bashrc/.zshrc for:
  claude -a work                 Switch and launch Claude in one step
  claude account switch work     Same as cloak switch
  claude account list            Same as cloak list

Learn more: https://github.com/synth1s/cloak`)

program
  .command('create [name]')
  .description('Save current session as a new cloak')
  .action((name) => {
    renderContextBar('create')
    return createAccount(name)
  })

program
  .command('switch <name>')
  .alias('use')
  .description('Wear a different cloak')
  .action((name) => {
    if (!_printEnv) renderContextBar('switch')
    return switchAccount(name, { printEnv: _printEnv })
  })

program
  .command('list')
  .alias('ls')
  .description('See all cloaks in your wardrobe')
  .action(() => {
    renderContextBar('list')
    return listAccounts()
  })

program
  .command('delete <name>')
  .alias('rm')
  .description('Discard a cloak')
  .action((name) => {
    renderContextBar('delete')
    return deleteAccount(name)
  })

program
  .command('whoami')
  .description('Which cloak are you wearing?')
  .action(() => {
    renderContextBar('whoami')
    return whoami()
  })

program
  .command('rename <old> <new>')
  .description('Rename a cloak')
  .action((oldName, newName) => {
    renderContextBar('rename')
    return renameAccount(oldName, newName)
  })

program
  .command('provider [name]')
  .alias('add-provider')
  .description('Add a custom model provider (GLM, DashScope, ...) as a cloak')
  .option('-p, --provider <id>', 'provider preset id (glm, dashscope, kimi, deepseek) or "custom"')
  .option('-u, --base-url <url>', 'Anthropic-compatible base URL (for custom providers)')
  .option('-t, --token <token>', 'API token / auth key')
  .option('-m, --model <model>', 'model name to use')
  .action((name, options) => {
    renderContextBar('provider')
    return addProvider(name, {
      provider: options.provider,
      baseUrl: options.baseUrl,
      token: options.token,
      model: options.model,
    })
  })

program
  .command('bind <name>')
  .description('Bind this directory to a cloak')
  .action((name) => {
    renderContextBar('bind')
    return bindAccount(name)
  })

program
  .command('unbind')
  .description('Unbind this directory')
  .action(() => {
    renderContextBar('unbind')
    return unbindAccount()
  })

program
  .command('context-bar', { hidden: true })
  .argument('<command>')
  .description('Show context bar')
  .action((cmd) => renderContextBar(cmd))

program
  .command('init')
  .description('Output shell integration code')
  .action(initShell)

program.parse(argv)
