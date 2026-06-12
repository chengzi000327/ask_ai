import type { ProviderConfig } from './types';

export const PROVIDER_PRESETS: ProviderConfig[] = [
  {
    id: 'anthropic',
    name: 'Claude',
    kind: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    apiKey: '',
    models: ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  },
  {
    id: 'openai',
    name: 'GPT',
    kind: 'openai-compat',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    models: ['gpt-5.5', 'chat-latest'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    kind: 'openai-compat',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: '',
    models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
  },
  {
    id: 'glm',
    name: 'GLM',
    kind: 'openai-compat',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiKey: '',
    models: ['glm-5.1', 'glm-4.7'],
  },
  {
    id: 'kimi',
    name: 'Kimi',
    kind: 'openai-compat',
    baseUrl: 'https://api.moonshot.cn/v1',
    apiKey: '',
    models: ['kimi-k2.6'],
  },
  {
    id: 'qwen',
    name: 'Qwen',
    kind: 'openai-compat',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: '',
    models: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    kind: 'openai-compat',
    baseUrl: 'https://api.minimax.chat/v1',
    apiKey: '',
    models: ['MiniMax-M3', 'MiniMax-M2.7'],
  },
];

// 历史预设里的默认模型名。merge 时会从用户已保存的列表里剔除，
// 否则旧版本写入 storage 的退役模型（如 claude-3-5-sonnet-latest 已 404）会一直残留。
export const LEGACY_PRESET_MODELS = new Set<string>([
  'claude-3-5-sonnet-latest',
  'claude-3-5-haiku-latest',
  'gpt-4.1-mini',
  'gpt-4.1',
  'deepseek-chat',
  'deepseek-reasoner',
  'glm-4-plus',
  'glm-4-flash',
  'moonshot-v1-8k',
  'moonshot-v1-32k',
  'MiniMax-Text-01',
]);
