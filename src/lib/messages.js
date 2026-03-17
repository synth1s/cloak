import chalk from 'chalk'

// Icons — consistent across all messages
const icon = {
  success: chalk.green('✔'),
  error: chalk.red('✖'),
  warning: chalk.yellow('⚠'),
  tip: '💡',
  active: chalk.green('●'),
  inactive: chalk.dim('○'),
}

// --- Success messages ---

export function cloakCreated(name) {
  return `${icon.success} Cloak ${chalk.bold(`"${name}"`)} created. Ready to wear!`
}

export function cloakSwitched(name) {
  return `${icon.success} Now wearing cloak ${chalk.bold(`"${name}"`)}.`
}

export function cloakDiscarded(name) {
  return `${icon.success} Cloak ${chalk.bold(`"${name}"`)} discarded.`
}

export function cloakRenamed(oldName, newName) {
  return `${icon.success} Cloak ${chalk.bold(`"${oldName}"`)} is now ${chalk.bold(`"${newName}"`)}.`
}

export function shellIntegrationAdded(rcFile) {
  return `${icon.success} All set! Shell integration added to ${chalk.bold(rcFile)}.`
}

// --- Error messages ---

export function validationError(error) {
  return `${icon.error} ${error}`
}

export function accountNotFound(name) {
  return `${icon.error} Couldn't find a cloak named ${chalk.bold(`"${name}"`)}.`
}

export function noActiveSession() {
  return `${icon.error} No active Claude Code session found.`
}

export function cannotDiscardActive() {
  return `${icon.error} You're currently wearing this cloak.`
}

export function accountAlreadyInUse(name) {
  return `${icon.error} A cloak named ${chalk.bold(`"${name}"`)} already exists.`
}

// --- Warning messages ---

export function alreadyWearing(name) {
  return `${icon.warning} You're already wearing cloak ${chalk.bold(`"${name}"`)}.`
}

export function switchRequired() {
  return `${icon.warning} Quick setup needed to enable switching.`
}

export function updateSessionAfterRename(newName) {
  return `${icon.warning} To keep using this cloak, run: ${chalk.white(`claude account switch ${newName}`)}`
}

// --- Info / hints ---

export function suggestCreate(name) {
  return chalk.dim(`  Try: cloak create ${name || '<name>'}`)
}

export function suggestSwitchFirst() {
  return chalk.dim('  Switch to a different cloak first, then try again.')
}

export function loginFirst() {
  return chalk.dim('  Open Claude Code and log in first.')
}

export function cancelled() {
  return chalk.dim('No changes made.')
}

export function noCloak() {
  return chalk.dim('No cloak active — using default Claude Code config.')
}

export function noCloaksYet() {
  return chalk.dim('No cloaks in your wardrobe yet.')
}

export function accountListHeader() {
  return chalk.bold('\nYour Cloaks\n')
}

export function accountListItem(name, isActive) {
  const marker = isActive ? icon.active : icon.inactive
  const label = isActive ? chalk.green.bold(name) : chalk.white(name)
  const tag = isActive ? chalk.green(' (active)') : ''
  return `  ${marker} ${label}${tag}`
}

export function alreadyInstalled(rcFile) {
  return chalk.dim(`  Already set up in ${rcFile} — you're good!`)
}

// --- Setup instructions ---

export function setupRunCommand(rcFile, name) {
  return chalk.dim('\n  Almost there! Run: ') + chalk.white(`source ${rcFile} && cloak switch ${name}\n`)
}

export function setupManualCommand(rcFile, name) {
  return chalk.dim('\n  Run: ') + chalk.white(`echo 'eval "$(cloak init)"' >> ${rcFile} && source ${rcFile} && cloak switch ${name}\n`)
}

// --- Tip ---

export function shellIntegrationTip(rcFile) {
  const file = rcFile || '~/.bashrc'
  return chalk.dim(`\n${icon.tip} Tip: Enable "claude -a" and "claude account" with:\n`) +
    chalk.dim(`   echo 'eval "$(cloak init)"' >> ${file} && source ${file}\n\n`)
}

// --- Active cloak indicator (shown on claude launch) ---

export function wearingCloak(name) {
  return `🔹 Wearing cloak "${name}"`
}

// --- Print-env (stdout, no chalk — evaluated by shell) ---

export function printEnvExport(dir) {
  return `export CLAUDE_CONFIG_DIR=${dir}\n`
}

export function printEnvEcho(name) {
  return `echo "Now wearing cloak ${name}."\n`
}

// --- Prompt messages ---

export const prompts = {
  accountName: 'Name your cloak:',
  overwriteConfirm: (name) => `Cloak "${name}" already exists. Replace it?`,
  deleteConfirm: (name) => `Remove cloak "${name}"? This can't be undone.`,
  renameConfirm: (oldName, newName) => `Rename cloak "${oldName}" to "${newName}"?`,
  setupChoice: 'How would you like to proceed?',
  setupAuto: 'Set it up now (recommended)',
  setupManual: 'Show me the manual steps',
}
