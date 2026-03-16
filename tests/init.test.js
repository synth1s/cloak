import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

const { getInitScript } = await import('../src/commands/init.js')

describe('init', () => {
  beforeEach(() => {
    process.env.SHELL = '/bin/bash'
  })

  it('I-01: output contains shell function claude()', () => {
    const output = getInitScript()
    assert.ok(output.includes('claude()'))
  })

  it('I-02: function intercepts account switch', () => {
    const output = getInitScript()
    assert.ok(output.includes('account'))
    assert.ok(output.includes('switch'))
  })

  it('I-03: function routes -a to cloak launch', () => {
    const output = getInitScript()
    assert.ok(output.includes('command cloak launch'))
  })

  it('I-04: function delegates other commands', () => {
    const output = getInitScript()
    assert.ok(output.includes('command claude "$@"'))
  })

  it('I-05: detects current shell', () => {
    process.env.SHELL = '/bin/zsh'
    const output = getInitScript()
    // Should still produce valid shell code
    assert.ok(output.includes('claude()'))
  })

  it('I-06: sets CLOAK_SHELL_INTEGRATION env var', () => {
    const output = getInitScript()
    assert.ok(output.includes('export CLOAK_SHELL_INTEGRATION=1'))
  })
})
