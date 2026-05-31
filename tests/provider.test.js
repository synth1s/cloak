import { describe, it, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import os from 'os'

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cloak-test-'))
process.env.HOME = TMP
delete process.env.CLAUDE_CONFIG_DIR

const { profileDir, profileSettingsPath, profileExists } = await import('../src/lib/paths.js')
const { PROFILES_DIR } = await import('../src/lib/paths.js')
const { addProvider } = await import('../src/commands/provider.js')

function cleanup() {
  if (fs.existsSync(PROFILES_DIR)) fs.rmSync(PROFILES_DIR, { recursive: true, force: true })
}

function readSettings(name) {
  return JSON.parse(fs.readFileSync(profileSettingsPath(name), 'utf8'))
}

function interceptExit(fn) {
  let exitCode = null
  const original = process.exit
  process.exit = (code) => { exitCode = code }
  return async () => {
    try { await fn() } finally { process.exit = original }
    return exitCode
  }
}

function interceptStderr(fn) {
  const original = console.error
  let output = ''
  console.error = (...args) => { output += args.join(' ') }
  return async () => {
    try { await fn() } finally { console.error = original }
    return output
  }
}

describe('provider', () => {
  beforeEach(() => {
    delete process.env.CLAUDE_CONFIG_DIR
    cleanup()
  })

  after(() => {
    fs.rmSync(TMP, { recursive: true, force: true })
  })

  it('PA-01: creates a provider cloak from a preset', async () => {
    await addProvider('glm', { provider: 'glm', token: 'sk-glm' })
    assert.ok(profileExists('glm'))
    const settings = readSettings('glm')
    assert.ok(settings.env.ANTHROPIC_BASE_URL.includes('bigmodel'))
    assert.equal(settings.env.ANTHROPIC_AUTH_TOKEN, 'sk-glm')
    // preset has a default model
    assert.ok(settings.env.ANTHROPIC_MODEL)
  })

  it('PA-02: creates a custom provider cloak with explicit base url', async () => {
    await addProvider('mine', { provider: 'custom', baseUrl: 'https://proxy.example/api', token: 't' })
    const settings = readSettings('mine')
    assert.equal(settings.env.ANTHROPIC_BASE_URL, 'https://proxy.example/api')
    assert.equal(settings.env.ANTHROPIC_AUTH_TOKEN, 't')
  })

  it('PA-03: model override wins over preset default', async () => {
    await addProvider('glm', { provider: 'glm', token: 't', model: 'glm-4.6-flash' })
    assert.equal(readSettings('glm').env.ANTHROPIC_MODEL, 'glm-4.6-flash')
  })

  it('PA-04: settings file is written with private permissions', async () => {
    await addProvider('glm', { provider: 'glm', token: 't' })
    const mode = fs.statSync(profileSettingsPath('glm')).mode & 0o777
    assert.equal(mode, 0o600)
  })

  it('PA-05: exits 1 for invalid account name', async () => {
    const run = interceptExit(() => addProvider('../bad', { provider: 'glm', token: 't' }))
    const code = await run()
    assert.equal(code, 1)
    assert.equal(profileExists('../bad'), false)
  })

  it('PA-06: exits 1 when base url cannot be resolved for custom', async () => {
    const run = interceptExit(() => addProvider('mine', { provider: 'custom', token: 't', baseUrl: '' }))
    const code = await run()
    assert.equal(code, 1)
    assert.equal(profileExists('mine'), false)
  })

  it('PA-07: exits 1 when token is missing', async () => {
    const run = interceptExit(() => addProvider('glm', { provider: 'glm', token: '' }))
    const code = await run()
    assert.equal(code, 1)
  })

  it('PA-08: does not overwrite existing cloak when confirm is false', async () => {
    await addProvider('glm', { provider: 'glm', token: 'first' })
    await addProvider('glm', { provider: 'glm', token: 'second', confirm: false })
    assert.equal(readSettings('glm').env.ANTHROPIC_AUTH_TOKEN, 'first')
  })

  it('PA-09: overwrites existing cloak when confirmed', async () => {
    await addProvider('glm', { provider: 'glm', token: 'first' })
    await addProvider('glm', { provider: 'glm', token: 'second', confirm: true })
    assert.equal(readSettings('glm').env.ANTHROPIC_AUTH_TOKEN, 'second')
  })

  it('PA-10: preserves unrelated settings keys when overwriting', async () => {
    await addProvider('glm', { provider: 'glm', token: 'first' })
    const settingsPath = profileSettingsPath('glm')
    const existing = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
    existing.theme = 'dark'
    fs.writeFileSync(settingsPath, JSON.stringify(existing))
    await addProvider('glm', { provider: 'glm', token: 'second', confirm: true })
    const settings = readSettings('glm')
    assert.equal(settings.theme, 'dark')
    assert.equal(settings.env.ANTHROPIC_AUTH_TOKEN, 'second')
  })

  it('PA-11: shows friendly error for invalid name', async () => {
    const capture = interceptStderr(() => {
      const run = interceptExit(() => addProvider('../bad', { provider: 'glm', token: 't' }))
      return run()
    })
    const stderr = await capture()
    assert.ok(stderr.includes('Account name'))
  })
})
