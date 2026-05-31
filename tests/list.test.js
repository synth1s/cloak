import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import os from 'os'

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cloak-test-'))
process.env.HOME = TMP
delete process.env.CLAUDE_CONFIG_DIR

const { profileDir, ensureProfilesDir, PROFILES_DIR } = await import('../src/lib/paths.js')
const { listAccounts } = await import('../src/commands/list.js')

function cleanup() {
  if (fs.existsSync(PROFILES_DIR)) fs.rmSync(PROFILES_DIR, { recursive: true, force: true })
}

describe('list', () => {
  beforeEach(() => {
    delete process.env.CLAUDE_CONFIG_DIR
    cleanup()
  })

  it('L-01: lists accounts with active marker', () => {
    fs.mkdirSync(profileDir('home'), { recursive: true })
    fs.mkdirSync(profileDir('work'), { recursive: true })
    process.env.CLAUDE_CONFIG_DIR = profileDir('work')
    const result = listAccounts()
    assert.ok(result.find(p => p.name === 'work' && p.active === true))
    assert.ok(result.find(p => p.name === 'home' && p.active === false))
  })

  it('L-02: returns empty array with no accounts', () => {
    ensureProfilesDir()
    const result = listAccounts()
    assert.deepEqual(result, [])
  })

  it('L-03: returns accounts in alphabetical order', () => {
    fs.mkdirSync(profileDir('zebra'), { recursive: true })
    fs.mkdirSync(profileDir('alpha'), { recursive: true })
    fs.mkdirSync(profileDir('mid'), { recursive: true })
    const result = listAccounts()
    assert.deepEqual(result.map(p => p.name), ['alpha', 'mid', 'zebra'])
  })

  it('L-04: marks active based on CLAUDE_CONFIG_DIR', () => {
    fs.mkdirSync(profileDir('work'), { recursive: true })
    fs.mkdirSync(profileDir('home'), { recursive: true })
    process.env.CLAUDE_CONFIG_DIR = profileDir('home')
    const result = listAccounts()
    assert.equal(result.find(p => p.name === 'home').active, true)
    assert.equal(result.find(p => p.name === 'work').active, false)
  })

  it('L-05: none marked as active when CLAUDE_CONFIG_DIR is not set', () => {
    fs.mkdirSync(profileDir('work'), { recursive: true })
    delete process.env.CLAUDE_CONFIG_DIR
    const result = listAccounts()
    assert.ok(result.every(p => p.active === false))
  })

  it('L-06: shows email for each account', () => {
    const dir = profileDir('work')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, '.claude.json'), JSON.stringify({
      oauthAccount: { emailAddress: 'filipe@company.com' }
    }))
    const result = listAccounts()
    assert.equal(result.find(p => p.name === 'work').email, 'filipe@company.com')
  })

  it('L-07: gracefully handles missing email', () => {
    fs.mkdirSync(profileDir('bare'), { recursive: true })
    const result = listAccounts()
    assert.equal(result.find(p => p.name === 'bare').email, null)
  })

  it('L-08: shows provider label for provider cloaks', () => {
    const dir = profileDir('glm')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({
      env: { ANTHROPIC_BASE_URL: 'https://open.bigmodel.cn/api/anthropic', ANTHROPIC_AUTH_TOKEN: 't' }
    }))
    const result = listAccounts()
    const entry = result.find(p => p.name === 'glm')
    assert.equal(entry.email, null)
    assert.ok(entry.provider.toLowerCase().includes('glm'))
  })
})

fs.rmSync(TMP, { recursive: true, force: true })
