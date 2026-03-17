import chalk from 'chalk'
import { getActiveProfile, getAccountEmail } from '../lib/paths.js'

export function showBanner(columns) {
  const name = getActiveProfile()
  if (!name) return

  const cols = columns || process.stderr.columns || process.stdout.columns || 80
  const email = getAccountEmail(name)
  const label = `cloak › ${name}`
  const emailSuffix = email ? ` — ${email}` : ''
  const msg = label + emailSuffix
  const inner = cols - 2
  const contentLen = msg.length + 2
  const pad = Math.max(0, inner - contentLen)

  const top = '╭' + '─'.repeat(inner) + '╮'
  const mid = '│ ' + chalk.bold(label) + chalk.dim(emailSuffix) + ' '.repeat(pad) + ' │'
  const bot = '╰' + '─'.repeat(inner) + '╯'

  process.stdout.write(top + '\n' + mid + '\n' + bot + '\n')
}
