import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'fs'
import inquirer from 'inquirer'
import {
  profileDir,
  profileSettingsPath,
  profileAuthPath,
  profileExists,
  ensureProfilesDir,
} from '../lib/paths.js'
import { PROVIDERS, findProvider, buildProviderEnv } from '../lib/providers.js'
import { validateAccountName } from '../lib/validate.js'
import * as msg from '../lib/messages.js'

export async function addProvider(name, options = {}) {
  if (!name) {
    const answer = await inquirer.prompt([{
      type: 'input',
      name: 'accountName',
      message: msg.prompts.providerName,
      validate: (v) => {
        const result = validateAccountName(v.trim())
        return result.valid || result.error
      },
    }])
    name = answer.accountName.trim()
  }

  const validation = validateAccountName(name)
  if (!validation.valid) {
    console.error(msg.validationError(validation.error))
    process.exit(1)
    return
  }

  // Resolve which provider preset (or custom) to use.
  let providerId = options.provider
  if (providerId === undefined) {
    const answer = await inquirer.prompt([{
      type: 'list',
      name: 'provider',
      message: msg.prompts.providerChoice,
      choices: [
        ...PROVIDERS.map(p => ({ name: p.label, value: p.id })),
        { name: msg.prompts.providerCustom, value: 'custom' },
      ],
    }])
    providerId = answer.provider
  }

  const preset = providerId === 'custom' ? null : findProvider(providerId)
  // Unknown preset id given non-interactively → treat as custom.

  // Resolve base URL: preset default, an explicit override, or a prompt.
  let baseUrl = options.baseUrl || (preset && preset.baseUrl)
  if (!baseUrl && options.baseUrl === undefined) {
    const answer = await inquirer.prompt([{
      type: 'input',
      name: 'baseUrl',
      message: msg.prompts.providerBaseUrl,
      validate: (v) => v.trim().length > 0 || 'A base URL is required.',
    }])
    baseUrl = answer.baseUrl.trim()
  }
  if (!baseUrl) {
    console.error(msg.providerBaseUrlRequired())
    process.exit(1)
    return
  }

  // Resolve model: explicit override or preset default (custom has none).
  const model = options.model || (preset && preset.defaultModel) || null

  // Resolve token: explicit or a masked prompt.
  let token = options.token
  if (token === undefined) {
    if (preset && preset.apiKeyUrl) console.log(msg.providerKeyHint(preset.apiKeyUrl))
    const answer = await inquirer.prompt([{
      type: 'password',
      name: 'token',
      mask: '*',
      message: msg.prompts.providerToken,
      validate: (v) => v.trim().length > 0 || 'An API token is required.',
    }])
    token = answer.token.trim()
  }
  if (!token) {
    console.error(msg.providerTokenRequired())
    process.exit(1)
    return
  }

  if (profileExists(name)) {
    if (options.confirm === false) {
      console.log(msg.cancelled())
      return
    }
    if (options.confirm === undefined) {
      const { overwrite } = await inquirer.prompt([{
        type: 'confirm',
        name: 'overwrite',
        message: msg.prompts.overwriteConfirm(name),
        default: false,
      }])
      if (!overwrite) {
        console.log(msg.cancelled())
        return
      }
    }
  }

  ensureProfilesDir()
  const dir = profileDir(name)
  mkdirSync(dir, { recursive: true, mode: 0o700 })

  // Merge into any existing settings so unrelated keys (theme, etc.) survive.
  const settingsPath = profileSettingsPath(name)
  let settings = {}
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf8'))
    } catch {
      settings = {}
    }
  }
  settings.env = { ...(settings.env || {}), ...buildProviderEnv({ baseUrl, token, model }) }
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n')
  chmodSync(settingsPath, 0o600)

  // Seed a minimal config so Claude Code skips OAuth onboarding for the
  // token-authenticated provider. Only write it if one doesn't exist yet.
  const authPath = profileAuthPath(name)
  if (!existsSync(authPath)) {
    writeFileSync(authPath, JSON.stringify({ hasCompletedOnboarding: true }, null, 2) + '\n')
    chmodSync(authPath, 0o600)
  }

  const label = preset ? preset.label : baseUrl
  console.log(msg.providerCloakCreated(name, label))
}
