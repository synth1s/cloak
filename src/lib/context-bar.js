import chalk from 'chalk'
import { getActiveProfile, getAccountEmail } from './paths.js'
import { getProfileProvider } from './providers.js'

export function renderContextBar(command, columns) {
  if (!process.stderr.isTTY) return

  const cols = columns || process.stderr.columns || process.stdout.columns || 80
  const profile = getActiveProfile()
  const email = profile ? getAccountEmail(profile) : null
  // Provider cloaks have no OAuth email — show the provider label instead.
  const detail = email || (profile ? (getProfileProvider(profile)?.label || null) : null)

  const prefix = 'cloak › '
  const cmdPart = command
  const profilePart = profile ? ' · ' + profile : ''
  const detailPart = (profile && detail) ? ' ‹' + detail + '›' : ''
  const text = prefix + cmdPart + profilePart + detailPart + ' '
  const barLen = Math.max(3, cols - text.length)

  const line =
    chalk.dim('cloak › ') +
    chalk.bold(command) +
    (profile ? chalk.dim(' · ') + chalk.white(profile) : '') +
    (detail ? chalk.dim(' ‹' + detail + '›') : '') +
    ' ' +
    chalk.dim('─'.repeat(barLen))

  process.stderr.write(line + '\n')
}
