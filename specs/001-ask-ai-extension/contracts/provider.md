# Contract: Provider 层

```ts
interface ChatOptions {
  config: ProviderConfig;
  model: string;
  messages: ChatMessage[];
  onDelta: (text: string) => void;
  signal?: AbortSignal;
}

interface Provider {
  chat(opts: ChatOptions): Promise<string>; // 完整回复；HTTP 非 2xx 抛 ProviderError(message, status)
}
```

## 实现

- **OpenAICompatProvider**: POST `{baseUrl}/chat/completions`，`Authorization: Bearer`，`stream:true`；解析 `choices[0].delta.content`；`data: [DONE]` 结束。覆盖 GPT/DeepSeek/GLM/Kimi/Qwen/MiniMax/自定义。
- **AnthropicProvider**: POST `{baseUrl}/v1/messages`，头 `x-api-key`、`anthropic-version: 2023-06-01`、`anthropic-dangerous-direct-browser-access: true`；system 消息提升为顶层 `system` 参数；解析 `content_block_delta.delta.text_delta`。
- **（二期预留）CompanionProvider**: 同一 Provider 接口经 localhost 与本地 Node 伴随程序通信；一期不实现，接口不变即可无感接入。

## 上游 API 契约（外部依赖）

- OpenAI 兼容 SSE: `data: {"choices":[{"delta":{"content":"..."}}]}` … `data: [DONE]`
- Anthropic SSE: `event: content_block_delta` + `data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"..."}}`
