import { existsSync, readFileSync } from 'fs'
import { profileSettingsPath } from './paths.js'

// Known Anthropic-compatible providers. Each exposes an endpoint that speaks
// the Anthropic Messages API, so Claude Code can target it by setting
// ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN (stored in the cloak's settings.json).
export const PROVIDERS = [
  {
    id: 'glm',
    label: 'GLM (Zhipu AI)',
    baseUrl: 'https://open.bigmodel.cn/api/anthropic',
    defaultModel: 'glm-4.6',
    apiKeyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
  },
  {
    id: 'dashscope',
    label: 'Alibaba DashScope (Qwen)',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v2/apps/claude-code-proxy',
    defaultModel: 'qwen3-coder-plus',
    apiKeyUrl: 'https://bailian.console.aliyun.com/?apiKey=1',
  },
  {
    id: 'kimi',
    label: 'Kimi (Moonshot AI)',
    baseUrl: 'https://api.moonshot.cn/anthropic',
    defaultModel: 'kimi-k2-0711-preview',
    apiKeyUrl: 'https://platform.moonshot.cn/console/api-keys',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/anthropic',
    defaultModel: 'deepseek-chat',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
  },
]

export function findProvider(id) {
  return PROVIDERS.find(p => p.id === id) || null
}

// Build the env block stored in a provider cloak's settings.json. Claude Code
// applies settings.json `env` to every session launched under that config dir.
export function buildProviderEnv({ baseUrl, token, model, smallFastModel }) {
  const env = {
    ANTHROPIC_BASE_URL: baseUrl,
    ANTHROPIC_AUTH_TOKEN: token,
  }
  if (model) env.ANTHROPIC_MODEL = model
  if (smallFastModel) env.ANTHROPIC_SMALL_FAST_MODEL = smallFastModel
  return env
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

// Resolve a friendly label for a base URL: prefer a known preset, else the host.
export function labelForBaseUrl(url) {
  if (!url) return null
  const host = hostnameOf(url)
  const preset = PROVIDERS.find(p => hostnameOf(p.baseUrl) === host)
  return preset ? preset.label : host
}

// Inspect a cloak's settings.json. Returns provider info if it points at a
// custom Anthropic endpoint, otherwise null (a regular Anthropic cloak).
export function getProfileProvider(name) {
  try {
    const file = profileSettingsPath(name)
    if (!existsSync(file)) return null
    const settings = JSON.parse(readFileSync(file, 'utf8'))
    const baseUrl = settings?.env?.ANTHROPIC_BASE_URL
    if (!baseUrl) return null
    return {
      baseUrl,
      model: settings.env.ANTHROPIC_MODEL || null,
      label: labelForBaseUrl(baseUrl),
    }
  } catch {
    return null
  }
}
