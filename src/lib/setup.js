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
  if (isAlreadyInstalled(rcFilePath)) return
  const line = '\neval "$(cloak init)"\n'
  writeFileSync(rcFilePath, line, { flag: 'a' })
}
