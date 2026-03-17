import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cli = join(__dirname, '..', 'src', 'cli.js')

function run(args) {
  return new Promise((resolve) => {
    execFile('node', [cli, ...args], { timeout: 5000 }, (error, stdout, stderr) => {
      resolve({ code: error?.code || 0, stdout, stderr })
    })
  })
}

describe('cli', () => {
  it('CLI-01: --print-env is accepted by switch command', async () => {
    const result = await run(['switch', '--print-env', 'nonexistent'])
    // Should fail because profile doesn't exist, NOT because of unknown option
    assert.ok(!result.stderr.includes('unknown option'), '--print-env must not be rejected as unknown option')
  })

  it('CLI-02: --print-env does not appear in help output', async () => {
    const result = await run(['--help'])
    assert.ok(!result.stdout.includes('print-env'), '--print-env must be hidden from help')
  })

  it('CLI-03: switch does not show [options] in help', async () => {
    const result = await run(['--help'])
    const switchLine = result.stdout.split('\n').find(l => l.includes('switch'))
    assert.ok(!switchLine.includes('[options]'), 'switch must not show [options] in help')
  })

  it('CLI-04: --help works', async () => {
    const result = await run(['--help'])
    assert.ok(result.stdout.includes('cloak'))
    assert.ok(result.stdout.includes('Quick start'))
  })

  it('CLI-05: --version works', async () => {
    const result = await run(['--version'])
    assert.ok(result.stdout.trim().match(/^\d+\.\d+\.\d+$/), 'version is semver')
  })
})
