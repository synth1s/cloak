import { describe, it, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import os from 'os'

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cloak-test-'))
process.env.HOME = TMP
delete process.env.CLAUDE_CONFIG_DIR

const { profileDir, PROFILES_DIR } = await import('../src/lib/paths.js')
const { switchAccount } = await import('../src/commands/switch.js')

function cleanup() {
  if (fs.existsSync(PROFILES_DIR)) fs.rmSync(PROFILES_DIR, { recursive: true, force: true })
  const bashrc = path.join(TMP, '.bashrc')
  if (fs.existsSync(bashrc)) fs.unlinkSync(bashrc)
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

async function captureStdoutAsync(fn) {
  const original = process.stdout.write
  let output = ''
  process.stdout.write = (chunk) => { output += chunk; return true }
  try { await fn() } finally { process.stdout.write = original }
  return output
}

describe('switch', () => {
  beforeEach(() => {
    delete process.env.CLAUDE_CONFIG_DIR
    process.env.SHELL = '/bin/bash'
    cleanup()
  })

  after(() => {
    fs.rmSync(TMP, { recursive: true, force: true })
  })

  it('S-01: outputs export command with --print-env', async () => {
    fs.mkdirSync(profileDir('work'), { recursive: true })
    const output = await captureStdoutAsync(() => switchAccount('work', { printEnv: true }))
    assert.ok(output.includes('export CLAUDE_CONFIG_DIR='))
  })

  it('S-02: exits with code 1 for missing account', async () => {
    const run = interceptExit(() => switchAccount('nonexistent', { printEnv: true }))
    const code = await run()
    assert.equal(code, 1)
  })

  it('S-02b: shows friendly error for missing account', async () => {
    const capture = interceptStderr(() => {
      const exitRun = interceptExit(() => switchAccount('nonexistent', { printEnv: true }))
      return exitRun()
    })
    const stderr = await capture()
    assert.ok(stderr.includes("Couldn't find"))
  })

  it('S-03: warns when already on the same account with no stdout', async () => {
    fs.mkdirSync(profileDir('work'), { recursive: true })
    process.env.CLAUDE_CONFIG_DIR = profileDir('work')
    const output = await captureStdoutAsync(() => switchAccount('work', { printEnv: true }))
    // stdout must be completely empty — any output would be eval'd by the shell function
    assert.equal(output, '', 'stdout must be empty when already wearing cloak')
  })

  it('S-04: auto setup installs to rc file when user chooses auto', async () => {
    fs.mkdirSync(profileDir('work'), { recursive: true })
    fs.writeFileSync(path.join(TMP, '.bashrc'), '# existing\n')
    await switchAccount('work', { setupChoice: 'auto' })
    const rcContent = fs.readFileSync(path.join(TMP, '.bashrc'), 'utf8')
    assert.ok(rcContent.includes('eval "$(cloak init)"'))
  })

  it('S-05: output contains correct path', async () => {
    fs.mkdirSync(profileDir('work'), { recursive: true })
    const output = await captureStdoutAsync(() => switchAccount('work', { printEnv: true }))
    assert.ok(output.includes(profileDir('work')))
  })

  it('S-06: manual choice does not modify rc file', async () => {
    fs.mkdirSync(profileDir('work'), { recursive: true })
    fs.writeFileSync(path.join(TMP, '.bashrc'), '# existing\n')
    await switchAccount('work', { setupChoice: 'manual' })
    const rcContent = fs.readFileSync(path.join(TMP, '.bashrc'), 'utf8')
    assert.ok(!rcContent.includes('cloak init'))
  })

  it('S-07: --print-env stdout contains only eval-safe shell code', async () => {
    fs.mkdirSync(profileDir('work'), { recursive: true })
    const output = await captureStdoutAsync(() => switchAccount('work', { printEnv: true }))
    // Every line must be valid shell: export, unset, or empty
    const lines = output.trim().split('\n')
    for (const line of lines) {
      assert.ok(
        line.startsWith('export ') || line.startsWith('unset ') || line.trim() === '',
        `stdout line must be eval-safe shell code, got: "${line}"`
      )
    }
  })

  it('S-08: --print-env confirmation goes to stderr not stdout', async () => {
    fs.mkdirSync(profileDir('work'), { recursive: true })
    let stderrOutput = ''
    const originalWrite = process.stderr.write
    process.stderr.write = (chunk) => { stderrOutput += chunk; return true }
    try {
      await switchAccount('work', { printEnv: true })
    } finally {
      process.stderr.write = originalWrite
    }
    assert.ok(stderrOutput.includes('Now wearing cloak'), 'confirmation goes to stderr')
  })

  it('S-09: error messages go to stderr not stdout when --print-env', async () => {
    const stdout = await captureStdoutAsync(() => {
      const run = interceptExit(() => switchAccount('nonexistent', { printEnv: true }))
      return run()
    })
    assert.equal(stdout, '', 'error must not leak to stdout with --print-env')
  })

  it('S-10: --print-env export path is quoted for shell safety', async () => {
    fs.mkdirSync(profileDir('work'), { recursive: true })
    const output = await captureStdoutAsync(() => switchAccount('work', { printEnv: true }))
    assert.ok(output.includes('CLAUDE_CONFIG_DIR="'), 'path is double-quoted')
  })

  it('S-11: --print-env includes env vars from target account', async () => {
    const { writeProfileEnv } = await import('../src/lib/paths.js')
    fs.mkdirSync(profileDir('work'), { recursive: true })
    writeProfileEnv('work', { CLAUDE_CODE_USE_VERTEX: '1', CLOUD_ML_REGION: 'us-east5' })
    const output = await captureStdoutAsync(() => switchAccount('work', { printEnv: true }))
    assert.ok(output.includes('export CLAUDE_CODE_USE_VERTEX="1"'))
    assert.ok(output.includes('export CLOUD_ML_REGION="us-east5"'))
  })

  it('S-12: --print-env unsets vars from previous account not in target', async () => {
    const { writeProfileEnv } = await import('../src/lib/paths.js')
    fs.mkdirSync(profileDir('work'), { recursive: true })
    fs.mkdirSync(profileDir('personal'), { recursive: true })
    writeProfileEnv('work', { WORK_ONLY_VAR: '1' })
    // Start as work, switch to personal
    process.env.CLAUDE_CONFIG_DIR = profileDir('work')
    const output = await captureStdoutAsync(() => switchAccount('personal', { printEnv: true }))
    assert.ok(output.includes('unset WORK_ONLY_VAR'), 'should unset vars not in target')
  })

  it('S-13: --print-env does not emit unset for vars shared between accounts', async () => {
    const { writeProfileEnv } = await import('../src/lib/paths.js')
    fs.mkdirSync(profileDir('work'), { recursive: true })
    fs.mkdirSync(profileDir('work2'), { recursive: true })
    writeProfileEnv('work', { SHARED_VAR: 'old' })
    writeProfileEnv('work2', { SHARED_VAR: 'new' })
    process.env.CLAUDE_CONFIG_DIR = profileDir('work')
    const output = await captureStdoutAsync(() => switchAccount('work2', { printEnv: true }))
    assert.ok(!output.includes('unset SHARED_VAR'), 'should not unset vars present in both accounts')
    assert.ok(output.includes('export SHARED_VAR="new"'))
  })

  it('S-14: --print-env escapes special chars in env var values', async () => {
    const { writeProfileEnv } = await import('../src/lib/paths.js')
    fs.mkdirSync(profileDir('work'), { recursive: true })
    writeProfileEnv('work', { MY_VAR: 'val$ue with "quotes" and `backticks`' })
    const output = await captureStdoutAsync(() => switchAccount('work', { printEnv: true }))
    assert.ok(!output.includes('"val$ue"') || output.includes('\\$'), 'dollar sign escaped')
    assert.ok(output.includes('\\"quotes\\"'), 'quotes escaped')
  })
})
