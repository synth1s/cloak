import { describe, it, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import os from 'os'

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cloak-test-'))
process.env.HOME = TMP

const { getRcFilePath, isAlreadyInstalled, installToRcFile } =
  await import('../src/lib/setup.js')

describe('setup', () => {
  beforeEach(() => {
    const bashrc = path.join(TMP, '.bashrc')
    const zshrc = path.join(TMP, '.zshrc')
    if (fs.existsSync(bashrc)) fs.unlinkSync(bashrc)
    if (fs.existsSync(zshrc)) fs.unlinkSync(zshrc)
  })

  after(() => {
    fs.rmSync(TMP, { recursive: true, force: true })
  })

  it('SE-01: getRcFilePath returns .bashrc for bash', () => {
    process.env.SHELL = '/bin/bash'
    assert.equal(getRcFilePath(), path.join(TMP, '.bashrc'))
  })

  it('SE-02: getRcFilePath returns .zshrc for zsh', () => {
    process.env.SHELL = '/bin/zsh'
    assert.equal(getRcFilePath(), path.join(TMP, '.zshrc'))
  })

  it('SE-03: isAlreadyInstalled returns false for clean file', () => {
    const rcFile = path.join(TMP, '.bashrc')
    fs.writeFileSync(rcFile, '# some config\nexport PATH=/usr/bin\n')
    assert.equal(isAlreadyInstalled(rcFile), false)
  })

  it('SE-04: isAlreadyInstalled returns true when line exists', () => {
    const rcFile = path.join(TMP, '.bashrc')
    fs.writeFileSync(rcFile, '# some config\neval "$(cloak init)"\n')
    assert.equal(isAlreadyInstalled(rcFile), true)
  })

  it('SE-05: installToRcFile appends init line', () => {
    const rcFile = path.join(TMP, '.bashrc')
    fs.writeFileSync(rcFile, '# existing config\n')
    installToRcFile(rcFile)
    const content = fs.readFileSync(rcFile, 'utf8')
    assert.ok(content.includes('eval "$(cloak init)"'))
  })

  it('SE-06: installToRcFile does not duplicate', () => {
    const rcFile = path.join(TMP, '.bashrc')
    fs.writeFileSync(rcFile, '# existing\neval "$(cloak init)"\n')
    installToRcFile(rcFile)
    const content = fs.readFileSync(rcFile, 'utf8')
    const matches = content.match(/cloak init/g)
    assert.equal(matches.length, 1)
  })

  it('SE-07: installToRcFile removes duplicates and keeps exactly one', () => {
    const rcFile = path.join(TMP, '.bashrc')
    fs.writeFileSync(rcFile, '# config\neval "$(cloak init)"\nexport FOO=bar\neval "$(cloak init)"\n')
    installToRcFile(rcFile)
    const content = fs.readFileSync(rcFile, 'utf8')
    const matches = content.match(/cloak init/g)
    assert.equal(matches.length, 1)
    assert.ok(content.includes('export FOO=bar'), 'preserves other config lines')
  })

  it('SE-08: installToRcFile cleans up then adds fresh line on dirty file', () => {
    const rcFile = path.join(TMP, '.bashrc')
    fs.writeFileSync(rcFile, 'eval "$(cloak init)"\neval "$(cloak init)"\neval "$(cloak init)"\n')
    installToRcFile(rcFile)
    const content = fs.readFileSync(rcFile, 'utf8')
    const matches = content.match(/cloak init/g)
    assert.equal(matches.length, 1)
  })
})
