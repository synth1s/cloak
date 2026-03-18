import { describe, it, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import os from 'os'

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cloak-test-'))
process.env.HOME = TMP
delete process.env.CLAUDE_CONFIG_DIR

const { profileDir, PROFILES_DIR } = await import('../src/lib/paths.js')
const { bindAccount } = await import('../src/commands/bind.js')
const { unbindAccount } = await import('../src/commands/unbind.js')

const WORK_DIR = path.join(TMP, 'project')

function createFakeProfile(name) {
  const dir = profileDir(name)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, '.claude.json'), '{}')
}

function cleanup() {
  if (fs.existsSync(PROFILES_DIR)) fs.rmSync(PROFILES_DIR, { recursive: true, force: true })
  const cloakFile = path.join(WORK_DIR, '.cloak')
  if (fs.existsSync(cloakFile)) fs.unlinkSync(cloakFile)
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

describe('bind', () => {
  beforeEach(() => {
    cleanup()
    if (!fs.existsSync(WORK_DIR)) fs.mkdirSync(WORK_DIR, { recursive: true })
  })

  after(() => {
    fs.rmSync(TMP, { recursive: true, force: true })
  })

  it('BI-01: bind creates .cloak file with profile name', async () => {
    createFakeProfile('work')
    await bindAccount('work', WORK_DIR)
    const content = fs.readFileSync(path.join(WORK_DIR, '.cloak'), 'utf8')
    assert.equal(content.trim(), 'work')
  })

  it('BI-02: bind fails for non-existent profile', async () => {
    const run = interceptExit(() => bindAccount('ghost', WORK_DIR))
    const code = await run()
    assert.equal(code, 1)
    assert.ok(!fs.existsSync(path.join(WORK_DIR, '.cloak')))
  })

  it('BI-03: bind fails for invalid name', async () => {
    const run = interceptExit(() => bindAccount('../bad', WORK_DIR))
    const code = await run()
    assert.equal(code, 1)
    assert.ok(!fs.existsSync(path.join(WORK_DIR, '.cloak')))
  })

  it('BI-04: unbind removes .cloak file', async () => {
    fs.writeFileSync(path.join(WORK_DIR, '.cloak'), 'work')
    await unbindAccount(WORK_DIR)
    assert.ok(!fs.existsSync(path.join(WORK_DIR, '.cloak')))
  })

  it('BI-05: unbind fails when no .cloak file', async () => {
    const run = interceptExit(() => unbindAccount(WORK_DIR))
    const code = await run()
    assert.equal(code, 1)
  })

  it('BI-06: .cloak file contains only the profile name', async () => {
    createFakeProfile('my-project')
    await bindAccount('my-project', WORK_DIR)
    const content = fs.readFileSync(path.join(WORK_DIR, '.cloak'), 'utf8')
    assert.equal(content, 'my-project\n')
  })
})
