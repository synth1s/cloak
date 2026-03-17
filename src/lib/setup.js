import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

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
    writeFileSync(rcFilePath, 'eval "$(cloak init)"\n')
    return
  }

  // Read existing content and remove ALL lines containing 'cloak init'
  const content = readFileSync(rcFilePath, 'utf8')
  const lines = content.split('\n')
  const cleaned = lines.filter(line => !line.includes('cloak init'))
  const cleanedContent = cleaned.join('\n').replace(/\n{3,}/g, '\n\n')

  // Write cleaned content + fresh init line
  writeFileSync(rcFilePath, cleanedContent.trimEnd() + '\neval "$(cloak init)"\n')
}
