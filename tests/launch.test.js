import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import os from 'os'

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cloak-test-'))
process.env.HOME = TMP
delete process.env.CLAUDE_CONFIG_DIR

const { profileDir, PROFILES_DIR } = await import('../src/lib/paths.js')
const { launchAccount } = await import('../src/commands/launch.js')

function createFakeProfile(name) {
  const dir = profileDir(name)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, '.claude.json'), '{}')
}

function cleanup() {
  if (fs.existsSync(PROFILES_DIR)) fs.rmSync(PROFILES_DIR, { recursive: true, force: true })
}

describe('launch', () => {
  beforeEach(() => {
    delete process.env.CLAUDE_CONFIG_DIR
    cleanup()
  })

  it('LA-01: spawns with CLAUDE_CONFIG_DIR set to correct path', async () => {
    createFakeProfile('work')
    let spawnedEnv, spawnedCmd
    const stubSpawner = (cmd, args, opts) => {
      spawnedCmd = cmd
      spawnedEnv = opts.env.CLAUDE_CONFIG_DIR
      return { on: (event, cb) => { if (event === 'close') cb(0) } }
    }
    await launchAccount('work', [], stubSpawner)
    assert.equal(spawnedCmd, 'claude')
    assert.equal(spawnedEnv, profileDir('work'))
  })

  it('LA-02: fails for missing account', async () => {
    const stubSpawner = () => ({ on: () => {} })
    await assert.rejects(() => launchAccount('ghost', [], stubSpawner), /not found/i)
  })

  it('LA-03: fails with invalid name', async () => {
    const stubSpawner = () => ({ on: () => {} })
    await assert.rejects(() => launchAccount('../bad', [], stubSpawner), /account name/i)
  })

  it('LA-04: passes extra arguments to spawn', async () => {
    createFakeProfile('work')
    let spawnedArgs
    const stubSpawner = (cmd, args, opts) => {
      spawnedArgs = args
      return { on: (event, cb) => { if (event === 'close') cb(0) } }
    }
    await launchAccount('work', ['--resume', '--verbose'], stubSpawner)
    assert.deepEqual(spawnedArgs, ['--resume', '--verbose'])
  })

  it('LA-05: works when account is already active', async () => {
    createFakeProfile('work')
    process.env.CLAUDE_CONFIG_DIR = profileDir('work')
    let spawned = false
    const stubSpawner = (cmd, args, opts) => {
      spawned = true
      return { on: (event, cb) => { if (event === 'close') cb(0) } }
    }
    await launchAccount('work', [], stubSpawner)
    assert.equal(spawned, true)
  })

  it('LA-06: sets process.env.CLAUDE_CONFIG_DIR in current process', async () => {
    createFakeProfile('home')
    createFakeProfile('work')
    process.env.CLAUDE_CONFIG_DIR = profileDir('home')

    const stubSpawner = (cmd, args, opts) => {
      return { on: (event, cb) => { if (event === 'close') cb(0) } }
    }
    await launchAccount('work', [], stubSpawner)
    // Node.js process env is updated, but this does NOT affect the parent shell
    assert.equal(process.env.CLAUDE_CONFIG_DIR, profileDir('work'))
  })

  it('LA-07: spawn receives the updated CLAUDE_CONFIG_DIR, not the old one', async () => {
    createFakeProfile('home')
    createFakeProfile('work')
    process.env.CLAUDE_CONFIG_DIR = profileDir('home')

    let spawnedEnv
    const stubSpawner = (cmd, args, opts) => {
      spawnedEnv = opts.env.CLAUDE_CONFIG_DIR
      return { on: (event, cb) => { if (event === 'close') cb(0) } }
    }
    await launchAccount('work', [], stubSpawner)
    assert.equal(spawnedEnv, profileDir('work'))
    assert.notEqual(spawnedEnv, profileDir('home'))
  })
})

fs.rmSync(TMP, { recursive: true, force: true })
