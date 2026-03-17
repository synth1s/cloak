import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const MARKER = '# Added by @synth1s/cloak'
const INIT_LINE = 'eval "$(cloak init)"'

function getHome() {
  return process.env.HOME || homedir()
}

export function getRcFilePath() {
  const shell = process.env.SHELL || ''
  if (shell.includes('zsh')) {
    return join(getHome(), '.zshrc')
  }
  return join(getHome(), '.bashrc')
}

export function isAlreadyInstalled(rcFilePath) {
  if (!existsSync(rcFilePath)) return false
  const content = readFileSync(rcFilePath, 'utf8')
  return content.includes('cloak init')
}

export function installToRcFile(rcFilePath) {
  if (!existsSync(rcFilePath)) {
    writeFileSync(rcFilePath, `${MARKER}\n${INIT_LINE}\n`)
    return
  }

  // Backup before modifying
  copyFileSync(rcFilePath, rcFilePath + '.cloak-backup')

  // Remove ALL lines containing 'cloak init' or the marker
  const content = readFileSync(rcFilePath, 'utf8')
  const lines = content.split('\n')
  const cleaned = lines.filter(line =>
    !line.includes('cloak init') && line !== MARKER
  )
  const cleanedContent = cleaned.join('\n').replace(/\n{3,}/g, '\n\n')

  // Append fresh marker + init line
  writeFileSync(rcFilePath, cleanedContent.trimEnd() + `\n${MARKER}\n${INIT_LINE}\n`)
}
