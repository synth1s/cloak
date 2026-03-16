import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import os from 'os'

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cloak-test-'))
process.env.HOME = TMP
delete process.env.CLAUDE_CONFIG_DIR

const { profileDir, profileAuthPath, profileSettingsPath, claudeAuthPath, claudeSettingsPath } =
  await import('../src/lib/paths.js')
const { createAccount } = await import('../src/commands/create.js')

function fakeAuth(content = { token: 'test-token' }) {
  const authPath = claudeAuthPath()
  fs.mkdirSync(path.dirname(authPath), { recursive: true })
  fs.writeFileSync(authPath, JSON.stringify(content))
}

function fakeSettings(content = { theme: 'dark' }) {
  const settingsPath = claudeSettingsPath()
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
  fs.writeFileSync(settingsPath, JSON.stringify(content))
}

function cleanup() {
  const cloakDir = path.join(TMP, '.cloak')
  if (fs.existsSync(cloakDir)) fs.rmSync(cloakDir, { recursive: true, force: true })
  const authPath = path.join(TMP, '.claude.json')
  if (fs.existsSync(authPath)) fs.unlinkSync(authPath)
  const claudeDir = path.join(TMP, '.claude')
  if (fs.existsSync(claudeDir)) fs.rmSync(claudeDir, { recursive: true, force: true })
}

// Intercept process.exit to test error paths
function interceptExit(fn) {
  let exitCode = null
  const original = process.exit
  process.exit = (code) => { exitCode = code }
  return async () => {
    try {
      await fn()
    } finally {
      process.exit = original
    }
    return exitCode
  }
}

describe('create', () => {
  beforeEach(() => {
    delete process.env.CLAUDE_CONFIG_DIR
    cleanup()
  })

  it('C-01: creates account with active session', async () => {
    fakeAuth({ token: 'work-token' })
    await createAccount('work')
    assert.ok(fs.existsSync(profileDir('work')))
    assert.ok(fs.existsSync(profileAuthPath('work')))
    const saved = JSON.parse(fs.readFileSync(profileAuthPath('work'), 'utf8'))
    assert.equal(saved.token, 'work-token')
  })

  it('C-02: fails without active session', async () => {
    const run = interceptExit(() => createAccount('work'))
    const code = await run()
    assert.equal(code, 1)
  })

  it('C-03: fails with invalid name', async () => {
    fakeAuth()
    const run = interceptExit(() => createAccount('../bad'))
    const code = await run()
    assert.equal(code, 1)
  })

  it('C-04: copies settings when they exist', async () => {
    fakeAuth()
    fakeSettings({ theme: 'dark' })
    await createAccount('work')
    assert.ok(fs.existsSync(profileSettingsPath('work')))
    const saved = JSON.parse(fs.readFileSync(profileSettingsPath('work'), 'utf8'))
    assert.equal(saved.theme, 'dark')
  })

  it('C-05: creates account without settings', async () => {
    fakeAuth()
    await createAccount('work')
    assert.ok(fs.existsSync(profileAuthPath('work')))
    assert.ok(!fs.existsSync(profileSettingsPath('work')))
  })

  it('C-06: overwrites existing account when confirmed', async () => {
    fakeAuth({ token: 'old-token' })
    await createAccount('work')
    fakeAuth({ token: 'new-token' })
    await createAccount('work', { confirm: true })
    const saved = JSON.parse(fs.readFileSync(profileAuthPath('work'), 'utf8'))
    assert.equal(saved.token, 'new-token')
  })

  it('C-07: does not overwrite when cancelled', async () => {
    fakeAuth({ token: 'old-token' })
    await createAccount('work')
    fakeAuth({ token: 'new-token' })
    await createAccount('work', { confirm: false })
    const saved = JSON.parse(fs.readFileSync(profileAuthPath('work'), 'utf8'))
    assert.equal(saved.token, 'old-token')
  })

  it('C-08: copies from CLAUDE_CONFIG_DIR when set', async () => {
    const customDir = path.join(TMP, 'custom-config')
    fs.mkdirSync(customDir, { recursive: true })
    fs.writeFileSync(path.join(customDir, '.claude.json'), JSON.stringify({ token: 'custom-token' }))
    process.env.CLAUDE_CONFIG_DIR = customDir

    await createAccount('custom')
    const saved = JSON.parse(fs.readFileSync(profileAuthPath('custom'), 'utf8'))
    assert.equal(saved.token, 'custom-token')
  })
})

fs.rmSync(TMP, { recursive: true, force: true })
