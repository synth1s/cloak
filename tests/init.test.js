import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

const { getInitScript } = await import('../src/commands/init.js')

// Helper: extract lines of a named function from the init script
function extractFunction(output, funcName) {
  const lines = output.split('\n')
  const startIdx = lines.findIndex(l => l.trim().startsWith(`${funcName}()`))
  if (startIdx === -1) return null
  const funcLines = []
  let depth = 0
  for (let i = startIdx; i < lines.length; i++) {
    funcLines.push(lines[i])
    if (lines[i].includes('{')) depth++
    if (lines[i].includes('}')) depth--
    if (depth === 0 && funcLines.length > 1) break
  }
  return funcLines.join('\n')
}

describe('init', () => {
  beforeEach(() => {
    process.env.SHELL = '/bin/bash'
  })

  it('I-01: output contains cloak() shell function', () => {
    const output = getInitScript()
    const func = extractFunction(output, 'cloak')
    assert.ok(func, 'cloak() function exists')
  })

  it('I-02: output contains claude() shell function', () => {
    const output = getInitScript()
    const func = extractFunction(output, 'claude')
    assert.ok(func, 'claude() function exists')
  })

  it('I-03: cloak() intercepts switch/use with eval', () => {
    const output = getInitScript()
    const func = extractFunction(output, 'cloak')
    assert.ok(func.includes('"switch"'), 'cloak() handles switch')
    assert.ok(func.includes('"use"'), 'cloak() handles use')
    assert.ok(func.includes('eval'), 'cloak() uses eval')
    assert.ok(func.includes('--print-env'), 'cloak() uses --print-env')
  })

  it('I-04: cloak() delegates other commands to binary', () => {
    const output = getInitScript()
    const func = extractFunction(output, 'cloak')
    assert.ok(func.includes('command cloak "$@"'), 'cloak() delegates to binary')
  })

  it('I-05: claude() -a evals switch then calls claude', () => {
    const output = getInitScript()
    const func = extractFunction(output, 'claude')
    const aIdx = func.indexOf('"-a"')
    const evalIdx = func.indexOf('eval', aIdx)
    const claudeIdx = func.indexOf('command claude', evalIdx)
    assert.ok(aIdx > -1, '-a branch exists')
    assert.ok(evalIdx > aIdx, 'eval after -a')
    assert.ok(claudeIdx > evalIdx, 'command claude after eval')
  })

  it('I-06: claude() delegates other commands', () => {
    const output = getInitScript()
    const func = extractFunction(output, 'claude')
    assert.ok(func.includes('command claude "$@"'), 'delegates to original claude')
  })

  it('I-07: sets CLOAK_SHELL_INTEGRATION env var', () => {
    const output = getInitScript()
    assert.ok(output.includes('export CLOAK_SHELL_INTEGRATION=1'))
  })

  it('I-08: claude account switch does NOT call command claude after eval', () => {
    const output = getInitScript()
    const func = extractFunction(output, 'claude')
    const lines = func.split('\n')

    // Find the account switch branch
    const switchIdx = lines.findIndex(l => l.includes('"switch"') && l.includes('"use"'))
    assert.ok(switchIdx > -1, 'switch/use branch exists in claude()')

    // Extract lines until next elif/else
    const branchLines = []
    for (let i = switchIdx + 1; i < lines.length; i++) {
      const trimmed = lines[i].trim()
      if (trimmed.startsWith('elif') || trimmed.startsWith('else')) break
      branchLines.push(lines[i])
    }

    const hasCommandClaude = branchLines.some(l => l.includes('command claude'))
    assert.ok(!hasCommandClaude, 'account switch branch does not call command claude')
  })

  it('I-09: passthrough calls cloak banner before launching claude', () => {
    const output = getInitScript()
    const func = extractFunction(output, 'claude')
    const lines = func.split('\n')

    const elseIdx = lines.findLastIndex(l => l.trim() === 'else')
    assert.ok(elseIdx > -1, 'else branch exists')

    const afterElse = lines.slice(elseIdx)
    const bannerIdx = afterElse.findIndex(l => l.includes('cloak banner'))
    const claudeIdx = afterElse.findIndex(l => l.includes('command claude'))
    assert.ok(bannerIdx > -1, 'else branch contains cloak banner')
    assert.ok(claudeIdx > bannerIdx, 'command claude comes after cloak banner')
  })

  it('I-10: banner output goes to stderr', () => {
    const output = getInitScript()
    const func = extractFunction(output, 'claude')

    const lines = func.split('\n')
    const bannerLine = lines.find(l => l.includes('cloak banner'))
    assert.ok(bannerLine, 'cloak banner line exists')
    assert.ok(bannerLine.includes('>&2'), 'banner output redirected to stderr')
  })

  it('I-11: -a branch calls cloak banner before command claude', () => {
    const output = getInitScript()
    const func = extractFunction(output, 'claude')
    const lines = func.split('\n')

    // Find the -a branch
    const aIdx = lines.findIndex(l => l.includes('"-a"'))
    assert.ok(aIdx > -1, '-a branch exists')

    const afterA = lines.slice(aIdx)
    const bannerIdx = afterA.findIndex(l => l.includes('cloak banner'))
    const claudeIdx = afterA.findIndex(l => l.includes('command claude'))
    assert.ok(bannerIdx > -1, '-a branch contains cloak banner')
    assert.ok(claudeIdx > bannerIdx, 'command claude comes after cloak banner in -a branch')
  })

  it('I-12: -a banner goes to stderr', () => {
    const output = getInitScript()
    const func = extractFunction(output, 'claude')
    const lines = func.split('\n')

    // Find banner lines in the -a branch area
    const aIdx = lines.findIndex(l => l.includes('"-a"'))
    const afterA = lines.slice(aIdx)
    const bannerLine = afterA.find(l => l.includes('cloak banner'))
    assert.ok(bannerLine, 'banner in -a branch exists')
    assert.ok(bannerLine.includes('>&2'), 'banner in -a branch goes to stderr')
  })
})
