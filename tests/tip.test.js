import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

const { showTipIfNeeded } = await import('../src/lib/tip.js')

function interceptStderr(fn) {
  const original = process.stderr.write
  let output = ''
  process.stderr.write = (chunk) => { output += chunk; return true }
  try { fn() } finally { process.stderr.write = original }
  return output
}

describe('tip', () => {
  beforeEach(() => {
    delete process.env.CLOAK_TIP_SHOWN
    delete process.env.CLOAK_SHELL_INTEGRATION
  })

  it('T-01: shows tip when shell integration is not active and TTY', () => {
    const originalIsTTY = process.stdout.isTTY
    process.stdout.isTTY = true
    const output = interceptStderr(() => showTipIfNeeded())
    process.stdout.isTTY = originalIsTTY
    assert.ok(output.length > 0)
  })

  it('T-02: suppressed when shell integration is active', () => {
    process.env.CLOAK_SHELL_INTEGRATION = '1'
    const output = interceptStderr(() => showTipIfNeeded())
    assert.equal(output, '')
  })

  it('T-03: suppressed when already shown this session', () => {
    process.env.CLOAK_TIP_SHOWN = '1'
    const output = interceptStderr(() => showTipIfNeeded())
    assert.equal(output, '')
  })

  it('T-04: suppressed when not a TTY', () => {
    const originalIsTTY = process.stdout.isTTY
    process.stdout.isTTY = false
    const output = interceptStderr(() => showTipIfNeeded())
    process.stdout.isTTY = originalIsTTY
    assert.equal(output, '')
  })

  it('T-05: sets CLOAK_TIP_SHOWN after showing', () => {
    const originalIsTTY = process.stdout.isTTY
    process.stdout.isTTY = true
    interceptStderr(() => showTipIfNeeded())
    process.stdout.isTTY = originalIsTTY
    assert.equal(process.env.CLOAK_TIP_SHOWN, '1')
  })

  it('T-06: tip contains setup command', () => {
    const originalIsTTY = process.stdout.isTTY
    process.stdout.isTTY = true
    const output = interceptStderr(() => showTipIfNeeded())
    process.stdout.isTTY = originalIsTTY
    assert.ok(output.includes('eval "$(cloak init)"'))
  })
})
