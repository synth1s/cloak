import { homedir } from 'os'
import { join, resolve, sep } from 'path'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'

function getHome() {
  return process.env.HOME || homedir()
}

export const HOME = getHome()
export const CLOAK_DIR = join(HOME, '.cloak')
export const PROFILES_DIR = join(CLOAK_DIR, 'profiles')

export function claudeAuthPath() {
  const configDir = process.env.CLAUDE_CONFIG_DIR
  if (configDir) {
    return join(configDir, '.claude.json')
  }
  return join(HOME, '.claude.json')
}

export function claudeSettingsPath() {
  const configDir = process.env.CLAUDE_CONFIG_DIR
  if (configDir) {
    return join(configDir, 'settings.json')
  }
  return join(HOME, '.claude', 'settings.json')
}

export function profileDir(name) {
  return join(PROFILES_DIR, name)
}

export function profileAuthPath(name) {
  return join(PROFILES_DIR, name, '.claude.json')
}

export function profileSettingsPath(name) {
  return join(PROFILES_DIR, name, 'settings.json')
}

export function ensureProfilesDir() {
  if (!existsSync(PROFILES_DIR)) {
    mkdirSync(PROFILES_DIR, { recursive: true, mode: 0o700 })
  }
}

export function profileExists(name) {
  return existsSync(profileDir(name))
}

export function listProfileNames() {
  ensureProfilesDir()
  return readdirSync(PROFILES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
}

export function getActiveProfile() {
  const configDir = process.env.CLAUDE_CONFIG_DIR
  if (!configDir) return null

  const resolved = resolve(configDir)
  const profilesResolved = resolve(PROFILES_DIR)

  if (!resolved.startsWith(profilesResolved + sep)) return null

  const name = resolved.slice(profilesResolved.length + 1).split(sep)[0]
  return name || null
}

export function profileEnvPath(name) {
  return join(PROFILES_DIR, name, 'env.json')
}

export function readProfileEnv(name) {
  try {
    const p = profileEnvPath(name)
    if (!existsSync(p)) return {}
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return {}
  }
}

export function writeProfileEnv(name, vars) {
  writeFileSync(profileEnvPath(name), JSON.stringify(vars, null, 2) + '\n', { mode: 0o600 })
}

export function getAccountEmail(name) {
  try {
    const authFile = profileAuthPath(name)
    if (!existsSync(authFile)) return null
    const data = JSON.parse(readFileSync(authFile, 'utf8'))
    return data?.oauthAccount?.emailAddress || null
  } catch {
    return null
  }
}
