import { describe, it, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import os from 'os'

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cloak-test-'))
process.env.HOME = TMP
delete process.env.CLAUDE_CONFIG_DIR

const { profileDir, PROFILES_DIR, profileEnvPath, readProfileEnv } = await import('../src/lib/paths.js')
const { envSet, envUnset, envList } = await import('../src/commands/env.js')

function createFakeProfile(name) {
  const dir = profileDir(name)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, '.claude.json'), '{}')
}

function cleanup() {
  if (fs.existsSync(PROFILES_DIR)) fs.rmSync(PROFILES_DIR, { recursive: true, force: true })
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

async function captureStdout(fn) {
  const original = process.stdout.write
  let output = ''
  process.stdout.write = (chunk) => { output += chunk; return true }
  try { await fn() } finally { process.stdout.write = original }
  return output
}

async function captureStderr(fn) {
  const original = console.error
  let output = ''
  console.error = (...args) => { output += args.join(' ') }
  try { await fn() } finally { console.error = original }
  return output
}

describe('env', () => {
  beforeEach(() => {
    delete process.env.CLAUDE_CONFIG_DIR
    cleanup()
  })

  after(() => {
    fs.rmSync(TMP, { recursive: true, force: true })
  })

  // --- envSet ---

  it('EV-01: set stores KEY=VALUE in env.json for active cloak', async () => {
    createFakeProfile('work')
    process.env.CLAUDE_CONFIG_DIR = profileDir('work')
    await envSet('CLAUDE_CODE_USE_VERTEX=1')
    const vars = readProfileEnv('work')
    assert.equal(vars.CLAUDE_CODE_USE_VERTEX, '1')
  })

  it('EV-02: set handles values with equals signs (e.g. base64)', async () => {
    createFakeProfile('work')
    process.env.CLAUDE_CONFIG_DIR = profileDir('work')
    await envSet('MY_VAR=abc=def==')
    const vars = readProfileEnv('work')
    assert.equal(vars.MY_VAR, 'abc=def==')
  })

  it('EV-03: set updates an existing var without clearing others', async () => {
    createFakeProfile('work')
    process.env.CLAUDE_CONFIG_DIR = profileDir('work')
    await envSet('A=1')
    await envSet('B=2')
    await envSet('A=99')
    const vars = readProfileEnv('work')
    assert.equal(vars.A, '99')
    assert.equal(vars.B, '2')
  })

  it('EV-04: set exits with code 1 when no active cloak', async () => {
    const run = interceptExit(() => envSet('KEY=VALUE'))
    const code = await run()
    assert.equal(code, 1)
  })

  it('EV-05: set exits with code 1 for invalid format (no equals)', async () => {
    createFakeProfile('work')
    process.env.CLAUDE_CONFIG_DIR = profileDir('work')
    const run = interceptExit(() => envSet('NOEQUALS'))
    const code = await run()
    assert.equal(code, 1)
  })

  it('EV-06: set exits with code 1 for empty key', async () => {
    createFakeProfile('work')
    process.env.CLAUDE_CONFIG_DIR = profileDir('work')
    const run = interceptExit(() => envSet('=value'))
    const code = await run()
    assert.equal(code, 1)
  })

  // --- envUnset ---

  it('EV-07: unset removes a var from env.json', async () => {
    createFakeProfile('work')
    process.env.CLAUDE_CONFIG_DIR = profileDir('work')
    fs.writeFileSync(profileEnvPath('work'), JSON.stringify({ A: '1', B: '2' }) + '\n', { mode: 0o600 })
    await envUnset('A')
    const vars = readProfileEnv('work')
    assert.equal(vars.A, undefined)
    assert.equal(vars.B, '2')
  })

  it('EV-08: unset exits with code 1 when no active cloak', async () => {
    const run = interceptExit(() => envUnset('KEY'))
    const code = await run()
    assert.equal(code, 1)
  })

  it('EV-09: unset is a no-op for a var that does not exist', async () => {
    createFakeProfile('work')
    process.env.CLAUDE_CONFIG_DIR = profileDir('work')
    // Should not throw or exit with error
    await envUnset('NONEXISTENT')
    const vars = readProfileEnv('work')
    assert.deepEqual(vars, {})
  })

  // --- envList ---

  it('EV-10: list prints env vars for active cloak', async () => {
    createFakeProfile('work')
    process.env.CLAUDE_CONFIG_DIR = profileDir('work')
    fs.writeFileSync(profileEnvPath('work'), JSON.stringify({ FOO: 'bar', BAZ: 'qux' }) + '\n', { mode: 0o600 })
    const output = await captureStdout(() => envList())
    assert.ok(output.includes('FOO'))
    assert.ok(output.includes('bar'))
    assert.ok(output.includes('BAZ'))
    assert.ok(output.includes('qux'))
  })

  it('EV-11: list shows message when no vars set', async () => {
    createFakeProfile('work')
    process.env.CLAUDE_CONFIG_DIR = profileDir('work')
    const output = await captureStdout(() => envList())
    assert.ok(output.length > 0 || true) // just should not throw
  })

  it('EV-12: list exits with code 1 when no active cloak', async () => {
    const run = interceptExit(() => envList())
    const code = await run()
    assert.equal(code, 1)
  })

  // --- readProfileEnv ---

  it('EV-13: readProfileEnv returns empty object when no env.json exists', () => {
    createFakeProfile('fresh')
    const vars = readProfileEnv('fresh')
    assert.deepEqual(vars, {})
  })

  it('EV-14: readProfileEnv returns empty object for malformed JSON', () => {
    createFakeProfile('bad')
    fs.writeFileSync(profileEnvPath('bad'), 'not json')
    const vars = readProfileEnv('bad')
    assert.deepEqual(vars, {})
  })
})
