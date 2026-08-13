import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import os from 'os'

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cloak-test-'))
process.env.HOME = TMP
delete process.env.CLAUDE_CONFIG_DIR

// The real inquirer — deliberately not stubbed at the module level. These tests
// exist because a two-major jump (10 -> 12) shipped without a single test
// touching this dependency.
const inquirer = (await import('inquirer')).default

const { profileDir, profileExists, claudeAuthPath, PROFILES_DIR } = await import('../src/lib/paths.js')
const { createAccount } = await import('../src/commands/create.js')
const { switchAccount } = await import('../src/commands/switch.js')
const { deleteAccount } = await import('../src/commands/delete.js')
const { renameAccount } = await import('../src/commands/rename.js')

// Every test gets a deadline so a prompt that never resolves fails loudly
// instead of hanging the runner.
const T = { timeout: 5000 }

function fakeAuth() {
  const authPath = claudeAuthPath()
  fs.mkdirSync(path.dirname(authPath), { recursive: true })
  fs.writeFileSync(authPath, JSON.stringify({ token: 'test-token' }))
}

function createFakeProfile(name) {
  const dir = profileDir(name)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, '.claude.json'), '{}')
  fs.writeFileSync(path.join(dir, 'settings.json'), '{}')
}

function cleanup() {
  if (fs.existsSync(PROFILES_DIR)) fs.rmSync(PROFILES_DIR, { recursive: true, force: true })
  const authPath = claudeAuthPath()
  if (fs.existsSync(authPath)) fs.unlinkSync(authPath)
}

// Swaps inquirer.prompt for a recorder. Commands import the same module
// instance, so replacing the property reaches them without stubbing the loader.
// Returns the question descriptors the command actually built.
function capturePrompt(answers, fn) {
  const original = inquirer.prompt
  const asked = []
  inquirer.prompt = async (questions) => {
    const q = questions[0]
    asked.push(q)
    if (!(q.name in answers)) {
      throw new Error(`test provided no answer for prompt "${q.name}"`)
    }
    return { [q.name]: answers[q.name] }
  }
  return async () => {
    const log = console.log
    console.log = () => {}
    try { await fn() } finally { inquirer.prompt = original; console.log = log }
    return asked
  }
}

describe('prompt', () => {
  beforeEach(() => {
    delete process.env.CLAUDE_CONFIG_DIR
    cleanup()
  })

  // Guards the dependency contract itself: if a future inquirer drops or
  // renames a prompt type we rely on, this fails before anything reaches users.
  it('P-01: inquirer registers every prompt type cloak uses', T, () => {
    const registered = Object.keys(inquirer.prompt.prompts)
    for (const type of ['input', 'confirm', 'list']) {
      assert.ok(registered.includes(type), `inquirer no longer registers "${type}" (has: ${registered.join(', ')})`)
    }
  })

  it('P-02: create with no name asks for one and uses the answer', T, async () => {
    fakeAuth()
    const asked = await capturePrompt({ accountName: 'from-prompt' }, () => createAccount(undefined, {}))()
    assert.equal(asked.length, 1)
    assert.equal(asked[0].type, 'input')
    assert.equal(asked[0].name, 'accountName')
    assert.equal(typeof asked[0].validate, 'function')
    assert.equal(profileExists('from-prompt'), true)
  })

  it('P-03: create trims whitespace around the answered name', T, async () => {
    fakeAuth()
    await capturePrompt({ accountName: '  spaced  ' }, () => createAccount(undefined, {}))()
    assert.equal(profileExists('spaced'), true)
  })

  it('P-04: the create validate callback accepts a valid name', T, async () => {
    fakeAuth()
    const asked = await capturePrompt({ accountName: 'work' }, () => createAccount(undefined, {}))()
    assert.equal(asked[0].validate('work'), true)
  })

  it('P-05: the create validate callback rejects an invalid name with a message', T, async () => {
    fakeAuth()
    const asked = await capturePrompt({ accountName: 'work' }, () => createAccount(undefined, {}))()
    const result = asked[0].validate('../escape')
    assert.equal(typeof result, 'string')
    assert.ok(result.length > 0)
  })

  it('P-06: create asks before overwriting, defaulting to no', T, async () => {
    fakeAuth()
    createFakeProfile('work')
    const asked = await capturePrompt({ overwrite: false }, () => createAccount('work', {}))()
    assert.equal(asked.length, 1)
    assert.equal(asked[0].type, 'confirm')
    assert.equal(asked[0].name, 'overwrite')
    assert.equal(asked[0].default, false)
  })

  it('P-07: delete asks for confirmation, defaulting to no', T, async () => {
    createFakeProfile('home')
    const asked = await capturePrompt({ confirm: false }, () => deleteAccount('home', {}))()
    assert.equal(asked[0].type, 'confirm')
    assert.equal(asked[0].default, false)
    assert.equal(profileExists('home'), true, 'answering no must not delete')
  })

  it('P-08: delete proceeds when the prompt is answered yes', T, async () => {
    createFakeProfile('home')
    await capturePrompt({ confirm: true }, () => deleteAccount('home', {}))()
    assert.equal(profileExists('home'), false)
  })

  it('P-09: rename asks for confirmation, defaulting to yes', T, async () => {
    createFakeProfile('old')
    const asked = await capturePrompt({ confirm: true }, () => renameAccount('old', 'new', {}))()
    assert.equal(asked[0].type, 'confirm')
    assert.equal(asked[0].default, true)
    assert.equal(profileExists('new'), true)
  })

  it('P-10: rename aborts when the prompt is answered no', T, async () => {
    createFakeProfile('old')
    await capturePrompt({ confirm: false }, () => renameAccount('old', 'new', {}))()
    assert.equal(profileExists('old'), true)
    assert.equal(profileExists('new'), false)
  })

  it('P-11: switch without shell integration offers the setup choices', T, async () => {
    createFakeProfile('work')
    const asked = await capturePrompt({ choice: 'manual' }, () => switchAccount('work', {}))()
    assert.equal(asked[0].type, 'list')
    assert.equal(asked[0].name, 'choice')
    assert.deepEqual(asked[0].choices.map(c => c.value), ['auto', 'manual'])
  })
})
