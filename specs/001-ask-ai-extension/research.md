# ask-ai-extension Research

**Feature Branch**: `001-ask-ai-extension`

## Research Questions

| ID | Question | Owner | Status | Decision Impact |
|---|---|---|---|---|
| RQ-001 | Chrome 原生 PDF 查看器能否被扩展注入交互？ | self | resolved | 不能（viewer 对扩展封闭）→ 自带 PDF.js 接管 |
| RQ-002 | 侧边栏宿主选型 | self | resolved | Chrome Side Panel API |
| RQ-003 | 如何识别"导航目标是 PDF"？ | self | resolved | webRequest onHeadersReceived 嗅探 Content-Type；file:// 用后缀 |
| RQ-004 | 多家 LLM 流式接口差异 | self | resolved | Anthropic 专用实现 + OpenAI 兼容一套覆盖其余 6 家及自定义 |
| RQ-005 | MV3 service worker 中可否长时间流式 fetch？ | self | resolved | 可以；chat 经长连接 Port 推送，Port 存活期间 SW 不被回收 |

## Decisions

| Topic | Decision | Rationale | Alternatives Rejected |
|---|---|---|---|
| PDF 渲染 | 扩展内 PDF.js 阅读器页接管 | text layer 是真实 DOM，可行级点击；原生 viewer 封闭 | 原生查看器上覆盖层（不可行）；只支持 HTML（损失首要场景） |
| 聊天宿主 | Chrome Side Panel | 浏览器级 UI，不与页面 CSS/JS 冲突，跨标签稳定 | iframe 注入式侧栏（易被 CSP/样式干扰）；viewer 内双栏（HTML 页无解） |
| 翻译展示 | 侧边栏聊天流卡片 | 可追问、有上下文连续性 | 原文旁浮层（交互断裂，PRD 已否决） |
| 翻译触发 | PDF 裸单击智能扩句 + 划选；HTML Alt+单击 + 划选 | PDF 页自有无副作用；HTML 页避免干扰链接 | 悬停即译（噪音大，PRD 已否决） |
| Provider 架构 | Provider 接口 + AnthropicProvider + OpenAICompatProvider | 6 家国产/OpenAI 全兼容 chat/completions，一套实现 + 预设配置即可 | 每家独立 SDK（依赖爆炸） |
| 流式解析 | 自写 SSE 解析器（ReadableStream → data 载荷） | 各家均为 text/event-stream，统一处理跨 chunk 重组 | eventsource-parser 依赖（功能简单不值引入） |
| 构建框架 | WXT + @wxt-dev/module-react | MV3 模板成熟、entrypoints 约定清晰、HMR | Plasmo（PDF 静态资源处理繁琐）、裸 Vite+CRX（手工 manifest） |
| 会话存储 | idb（IndexedDB），按论文 URL 索引 | 结构化、容量大；chrome.storage 不适合会话体量 | localStorage（容量/序列化限制） |
| PDF 重定向 | webRequest（观察）+ tabs.update | 不需 blocking 权限，MV3 合规 | declarativeNetRequest redirect（无法按响应头 Content-Type 条件化） |

## External References

- Chrome Side Panel API: https://developer.chrome.com/docs/extensions/reference/api/sidePanel
- pdfjs-dist TextLayer (v4+): https://mozilla.github.io/pdf.js/
- WXT: https://wxt.dev
- Anthropic Messages API（CORS 直连需 anthropic-dangerous-direct-browser-access 头）
