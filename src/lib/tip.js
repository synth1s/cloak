import chalk from 'chalk'

export function showTipIfNeeded() {
  if (process.env.CLOAK_SHELL_INTEGRATION === '1') return
  if (process.env.CLOAK_TIP_SHOWN === '1') return
  if (!process.stdout.isTTY) return

  process.stderr.write(
    chalk.dim('\n💡 Tip: Run this once to enable "claude -a" and "claude account":\n') +
    chalk.dim('   echo \'eval "$(cloak init)"\' >> ~/.bashrc && source ~/.bashrc\n\n')
  )

  process.env.CLOAK_TIP_SHOWN = '1'
}
