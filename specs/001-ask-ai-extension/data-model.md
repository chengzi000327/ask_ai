# ask-ai-extension Data Model

**Feature Branch**: `001-ask-ai-extension`

## Entities

### ProviderConfig（chrome.storage.local，Settings 内嵌）

- Purpose: 一家模型供应方的接入配置（预设或自定义端点）。
- Fields:
  - `id`: string — 'anthropic' | 'openai' | 'deepseek' | 'glm' | 'kimi' | 'qwen' | 'minimax' | 'custom-*'
  - `name`: string — 显示名
  - `kind`: 'anthropic' | 'openai-compat'
  - `baseUrl`: string — 不含尾随斜杠
  - `apiKey`: string — 空串 = 未启用
  - `models`: string[] — 可选模型名列表（设置页可编辑）
- Validation: baseUrl 非空；custom 端点 id 以 `custom-` 前缀生成。

### Settings（chrome.storage.local，key = `ask_ai_settings`）

- Fields: `providers: ProviderConfig[]`、`defaultModel: ModelRef{providerId, model}`、`targetLang: string`（默认 '中文'）。
- 加载时与最新 PRESETS 合并：已存值优先、缺失预设补齐、自定义端点保留。

### PaperContext（background 内存 Map，不持久化）

- Fields: `url`（论文真实 URL，viewer 页用 ?file= 还原）、`title`、`fullText`（按页/段拼接）。
- 生命周期: PAPER_LOADED 写入；SW 重启丢失后由页面重新上报。

### ChatMessage

- Fields: `role: 'system'|'user'|'assistant'`、`content: string`。

### DisplayMsg / Session（IndexedDB `ask_ai` / store `sessions`，key = 论文 URL）

- DisplayMsg 在 ChatMessage 上扩展 UI 字段: `kind: 'chat'|'translation'`、`sourceText?`（翻译卡片原文引用）、`status: 'streaming'|'done'|'interrupted'|'error'`、`errorKind?: 'auth'|'retryable'|'other'`。
- Session Fields: `url`、`title`、`messages: DisplayMsg[]`、`model: ModelRef`（会话当前模型）、`updatedAt`。

### TranslatePayload（消息总线传输对象）

- Fields: `text`（待翻原文）、`context`（邻近上下文）、`paperUrl`、`paperTitle`。

## State Transitions

| Entity | From | To | Trigger | Guard |
|---|---|---|---|---|
| DisplayMsg(assistant) | streaming | done | Port 收到 `{type:'done'}` | — |
| DisplayMsg(assistant) | streaming | interrupted | Port disconnect / 收到 error 且已有部分文本 | partial.length > 0 |
| DisplayMsg(assistant) | streaming | error | Port 收到 `{type:'error'}` 且无部分文本 | — |
| DisplayMsg(error) | error | streaming | 用户点重试 | 重发同一请求 |
| Session | — | created | 首条消息发出 | 按 paperUrl upsert |
| PaperContext | absent | cached | PAPER_LOADED | — |
