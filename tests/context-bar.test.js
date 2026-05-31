import { describe, it, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import os from 'os'

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cloak-test-'))
process.env.HOME = TMP
delete process.env.CLAUDE_CONFIG_DIR

const { profileDir, PROFILES_DIR } = await import('../src/lib/paths.js')
const { renderContextBar } = await import('../src/lib/context-bar.js')

function createFakeProfile(name, email) {
  const dir = profileDir(name)
  fs.mkdirSync(dir, { recursive: true })
  if (email) {
    fs.writeFileSync(path.join(dir, '.claude.json'), JSON.stringify({
      oauthAccount: { emailAddress: email }
    }))
  }
}

function cleanup() {
  if (fs.existsSync(PROFILES_DIR)) fs.rmSync(PROFILES_DIR, { recursive: true, force: true })
}

function captureStderr(fn) {
  const original = process.stderr.write
  let output = ''
  process.stderr.write = (chunk) => { output += chunk; return true }
  const origTTY = process.stderr.isTTY
  process.stderr.isTTY = true
  try { fn() } finally {
    process.stderr.write = original
    process.stderr.isTTY = origTTY
  }
  return output
}

describe('context-bar', () => {
  beforeEach(() => {
    delete process.env.CLAUDE_CONFIG_DIR
    cleanup()
  })

  after(() => {
    fs.rmSync(TMP, { recursive: true, force: true })
  })

  it('CB-01: renders with command, profile and email', () => {
    createFakeProfile('work', 'filipe@company.com')
    process.env.CLAUDE_CONFIG_DIR = profileDir('work')
    const output = captureStderr(() => renderContextBar('list', 80))
    assert.ok(output.includes('cloak'), 'contains cloak')
    assert.ok(output.includes('list'), 'contains command')
    assert.ok(output.includes('work'), 'contains profile')
    assert.ok(output.includes('filipe@company.com'), 'contains email')
  })

  it('CB-02: suppressed when not a TTY', () => {
    createFakeProfile('work', 'filipe@company.com')
    process.env.CLAUDE_CONFIG_DIR = profileDir('work')
    const original = process.stderr.write
    let output = ''
    process.stderr.write = (chunk) => { output += chunk; return true }
    const origTTY = process.stderr.isTTY
    process.stderr.isTTY = false
    try { renderContextBar('list', 80) } finally {
      process.stderr.write = original
      process.stderr.isTTY = origTTY
    }
    assert.equal(output, '')
  })

  it('CB-03: bar fills to terminal width', () => {
    createFakeProfile('work', 'filipe@company.com')
    process.env.CLAUDE_CONFIG_DIR = profileDir('work')
    const output = captureStderr(() => renderContextBar('list', 80))
    // Strip ANSI codes for length check
    const clean = output.replace(/\x1b\[[0-9;]*m/g, '').trimEnd()
    assert.equal(clean.length, 80)
  })

  it('CB-04: shows only command when no profile active', () => {
    delete process.env.CLAUDE_CONFIG_DIR
    const output = captureStderr(() => renderContextBar('list', 80))
    assert.ok(output.includes('list'), 'contains command')
    assert.ok(!output.includes('work'), 'no profile')
  })

  it('CB-05: gracefully handles missing email', () => {
    createFakeProfile('bare')
    process.env.CLAUDE_CONFIG_DIR = profileDir('bare')
    const output = captureStderr(() => renderContextBar('whoami', 80))
    assert.ok(output.includes('bare'), 'contains profile')
    assert.ok(!output.includes('‹'), 'no email brackets')
  })

  it('CB-06: shows provider label for provider cloaks', () => {
    const dir = profileDir('glm')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({
      env: { ANTHROPIC_BASE_URL: 'https://open.bigmodel.cn/api/anthropic', ANTHROPIC_AUTH_TOKEN: 't' }
    }))
    process.env.CLAUDE_CONFIG_DIR = profileDir('glm')
    const output = captureStderr(() => renderContextBar('whoami', 80))
    assert.ok(output.includes('glm'), 'contains profile')
    assert.ok(output.includes('GLM'), 'contains provider label')
  })
})
