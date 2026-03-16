import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

const { getInitScript } = await import('../src/commands/init.js')

// Helper: extract lines between a start condition and the next elif/else at same indent
function extractBranch(lines, startIdx) {
  const branchLines = []
  const startIndent = lines[startIdx].search(/\S/)
  for (let i = startIdx + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    const indent = lines[i].search(/\S/)
    if (indent <= startIndent && (trimmed.startsWith('elif') || trimmed.startsWith('else') || trimmed === 'fi')) break
    branchLines.push(lines[i])
  }
  return branchLines
}

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

  it('I-03: -a evals switch then calls claude', () => {
    const output = getInitScript()
    assert.ok(output.includes('cloak switch --print-env'))
    assert.ok(output.includes('command claude'))
  })

  it('I-04: function delegates other commands', () => {
    const output = getInitScript()
    assert.ok(output.includes('command claude "$@"'))
  })

  it('I-05: detects current shell', () => {
    process.env.SHELL = '/bin/zsh'
    const output = getInitScript()
    assert.ok(output.includes('claude()'))
  })

  it('I-06: sets CLOAK_SHELL_INTEGRATION env var', () => {
    const output = getInitScript()
    assert.ok(output.includes('export CLOAK_SHELL_INTEGRATION=1'))
  })

  it('I-07: -a sets env in parent shell via eval before command claude', () => {
    const output = getInitScript()
    const aIndex = output.indexOf('"-a"')
    const evalIndex = output.indexOf('eval', aIndex)
    const claudeIndex = output.indexOf('command claude', evalIndex)
    assert.ok(aIndex > -1, '-a branch exists')
    assert.ok(evalIndex > aIndex, 'eval appears after -a')
    assert.ok(claudeIndex > evalIndex, 'command claude appears after eval')
  })

  it('I-08: account switch does NOT call command claude after eval', () => {
    const output = getInitScript()
    const lines = output.split('\n')

    const switchLineIdx = lines.findIndex(l => l.includes('"switch"') && l.includes('"use"'))
    assert.ok(switchLineIdx > -1, 'switch/use branch exists')

    const branchLines = extractBranch(lines, switchLineIdx)
    const hasCommandClaude = branchLines.some(l => l.includes('command claude'))
    assert.ok(!hasCommandClaude, 'switch/use branch does not call command claude')
  })
})
