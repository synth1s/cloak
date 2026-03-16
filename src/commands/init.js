export function getInitScript() {
  /* eslint-disable no-template-curly-in-string */
  const lines = [
    'export CLOAK_SHELL_INTEGRATION=1',
    '',
    'claude() {',
    '  if [ "$1" = "account" ]; then',
    '    local subcmd="$2"',
    '    shift 2',
    '    if [ "$subcmd" = "switch" ] || [ "$subcmd" = "use" ]; then',
    '      local output',
    '      output=$(command cloak switch --print-env "$@")',
    '      local exit_code=$?',
    '      if [ $exit_code -eq 0 ]; then',
    '        eval "$output"',
    '      fi',
    '    else',
    '      command cloak "$subcmd" "$@"',
    '    fi',
    '  elif [ "$1" = "-a" ] && [ -n "$2" ]; then',
    '    local name="$2"',
    '    shift 2',
    '    local output',
    '    output=$(command cloak switch --print-env "$name")',
    '    local exit_code=$?',
    '    if [ $exit_code -eq 0 ]; then',
    '      eval "$output"',
    '      command claude "$@"',
    '    fi',
    '  else',
    '    command claude "$@"',
    '  fi',
    '}',
  ]
  return lines.join('\n') + '\n'
}

export async function initShell() {
  process.stdout.write(getInitScript())
}
