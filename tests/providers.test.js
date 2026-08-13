import { describe, it, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import os from 'os'

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cloak-test-'))
process.env.HOME = TMP
delete process.env.CLAUDE_CONFIG_DIR

const { profileDir, profileSettingsPath, PROFILES_DIR } = await import('../src/lib/paths.js')
const {
  PROVIDERS,
  findProvider,
  buildProviderEnv,
  getProfileProvider,
  labelForBaseUrl,
} = await import('../src/lib/providers.js')

function cleanup() {
  if (fs.existsSync(PROFILES_DIR)) fs.rmSync(PROFILES_DIR, { recursive: true, force: true })
}

function writeProfileSettings(name, settings) {
  const dir = profileDir(name)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(profileSettingsPath(name), JSON.stringify(settings))
}

describe('providers', () => {
  beforeEach(() => {
    delete process.env.CLAUDE_CONFIG_DIR
    cleanup()
  })

  after(() => {
    fs.rmSync(TMP, { recursive: true, force: true })
  })

  it('PR-01: PROVIDERS includes glm and dashscope presets', () => {
    const ids = PROVIDERS.map(p => p.id)
    assert.ok(ids.includes('glm'), 'has glm')
    assert.ok(ids.includes('dashscope'), 'has dashscope')
  })

  it('PR-02: every preset has a baseUrl and label', () => {
    for (const p of PROVIDERS) {
      assert.ok(typeof p.baseUrl === 'string' && p.baseUrl.length > 0, `${p.id} has baseUrl`)
      assert.ok(typeof p.label === 'string' && p.label.length > 0, `${p.id} has label`)
    }
  })

  it('PR-03: findProvider returns the matching preset', () => {
    const glm = findProvider('glm')
    assert.equal(glm.id, 'glm')
    assert.ok(glm.baseUrl.includes('bigmodel'))
  })

  it('PR-04: findProvider returns null for unknown id', () => {
    assert.equal(findProvider('nope'), null)
  })

  it('PR-05: buildProviderEnv sets base url and auth token', () => {
    const env = buildProviderEnv({ baseUrl: 'https://x.example/api', token: 'sk-123' })
    assert.equal(env.ANTHROPIC_BASE_URL, 'https://x.example/api')
    assert.equal(env.ANTHROPIC_AUTH_TOKEN, 'sk-123')
  })

  it('PR-06: buildProviderEnv includes model only when provided', () => {
    const without = buildProviderEnv({ baseUrl: 'https://x', token: 't' })
    assert.equal(without.ANTHROPIC_MODEL, undefined)
    const withModel = buildProviderEnv({ baseUrl: 'https://x', token: 't', model: 'glm-4.6' })
    assert.equal(withModel.ANTHROPIC_MODEL, 'glm-4.6')
  })

  it('PR-07: getProfileProvider returns provider info from settings env', () => {
    writeProfileSettings('glmcloak', {
      env: { ANTHROPIC_BASE_URL: 'https://open.bigmodel.cn/api/anthropic', ANTHROPIC_AUTH_TOKEN: 't', ANTHROPIC_MODEL: 'glm-4.6' },
    })
    const info = getProfileProvider('glmcloak')
    assert.equal(info.baseUrl, 'https://open.bigmodel.cn/api/anthropic')
    assert.equal(info.model, 'glm-4.6')
    assert.ok(info.label.toLowerCase().includes('glm'))
  })

  it('PR-08: getProfileProvider returns null when no base url is set', () => {
    writeProfileSettings('plain', { theme: 'dark' })
    assert.equal(getProfileProvider('plain'), null)
  })

  it('PR-09: getProfileProvider returns null for missing/corrupt settings', () => {
    fs.mkdirSync(profileDir('bare'), { recursive: true })
    assert.equal(getProfileProvider('bare'), null)
    fs.writeFileSync(profileSettingsPath('bare'), 'not json')
    assert.equal(getProfileProvider('bare'), null)
  })

  it('PR-10: labelForBaseUrl maps a known host to its preset label', () => {
    const label = labelForBaseUrl('https://open.bigmodel.cn/api/anthropic')
    assert.ok(label.toLowerCase().includes('glm'))
  })

  it('PR-11: labelForBaseUrl falls back to hostname for unknown urls', () => {
    assert.equal(labelForBaseUrl('https://proxy.internal.corp/api'), 'proxy.internal.corp')
  })
})
