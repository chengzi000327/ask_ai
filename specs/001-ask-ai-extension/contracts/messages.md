# Contract: 扩展内部消息总线

## 单次消息（chrome.runtime.sendMessage）

```ts
type BusMessage =
  | { type: 'TRANSLATE_REQUEST'; text; context; paperUrl; paperTitle }  // viewer/content → background
  | { type: 'TRANSLATE_PUSH'; payload: TranslatePayload }               // background → sidepanel 广播
  | { type: 'PAPER_LOADED'; url; title; fullText }                      // viewer/content → background
  | { type: 'GET_PAPER'; url }            // sidepanel → background，响应 PaperContext | null
  | { type: 'GET_PENDING_TRANSLATE' }     // sidepanel → background，响应 TranslatePayload | null（取走即清空）
  | { type: 'BYPASS_PDF'; url }           // viewer → background，本次放行原生查看器
```

## 长连接 Port（name: 'chat'，sidepanel → background）

请求：`{ sessionUrl, model: ModelRef, messages: ChatMessage[] }`
流式事件（background → sidepanel）：

```ts
type ChatPortEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; full: string }
  | { type: 'error'; message: string; status?: number }
```

约定：每条用户消息一次 connect；sidepanel 断开 Port = 取消请求（AbortController）。
