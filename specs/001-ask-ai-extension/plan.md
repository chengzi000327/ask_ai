# Implementation Plan: ask-ai-extension

**Branch**: `001-ask-ai-extension` | **Spec**: `specs/001-ask-ai-extension/spec.md`

## Summary

MV3 Chrome 扩展：自带 PDF.js 阅读器接管 PDF 实现行级点击扩句翻译，Chrome Side Panel 作为唯一聊天宿主流式渲染翻译卡片与全文讨论，background service worker 承担 PDF 重定向、Provider 层 SSE 流式调用（长连接 Port）与论文上下文缓存；7 家预设 + OpenAI 兼容自定义端点全 API key 接入；会话按论文 URL 存 IndexedDB。

## PRD Traceability

Source: `prd-source.md` ｜ Map: `traceability.md`

- P0 source sections: PRD-S001..S006, S008（功能本体）
- 实现层约束: PRD-S007（架构）、S009（测试）
- Deferred: PRD-S010 二期（Non-Goal，仅留 Provider 接口位）；S003 的"点击章节优先截断"（A3 backlog）

## Technical Context

- Language/Version: TypeScript 5.x，strict
- Primary Dependencies: react、react-dom、wxt、@wxt-dev/module-react、pdfjs-dist、idb
- Storage: chrome.storage.local（设置）/ IndexedDB（会话）/ 内存（论文全文）
- Testing: vitest（node env）+ fake-indexeddb；UI 手工验收
- Target Platform: Chrome ≥ 120（Side Panel API）

## Research

Source: `research.md` — 9 项决策全部 resolved，无 open risks 阻塞。关键：PDF.js 接管（原生 viewer 封闭）、Side Panel 宿主、webRequest 观察 + tabs.update 重定向、Anthropic + OpenAI 兼容双 Provider、自写 SSE 解析。

## Data Model

Source: `data-model.md` — ProviderConfig/Settings/PaperContext/ChatMessage/DisplayMsg/Session/TranslatePayload；DisplayMsg 状态机 streaming→done/interrupted/error→(重试)streaming。

## Contracts

Source: `contracts/` — messages.md（总线 + chat Port 事件）、provider.md（Provider 接口与两实现 + 二期 CompanionProvider 预留）。

## Quickstart

Source: `quickstart.md` — npm test / tsc / build / 手工验收 7 步。

## Constitution Check

| Gate | Result | Date | Notes |
|---|---|---|---|
| Pre-research | PASS | 2026-06-11 | constitution v1.0.0 六原则均可满足，无需违例 |
| Post-design | PASS | 2026-06-11 | shared/providers 零 chrome 依赖（P2）；TDD 范围=纯逻辑（P3）；Provider 契约统一（P4）；本地存储（P1）；ProviderError 显式（P5） |

- [x] Project constitution rules are respected (boundaries, testing, dependency policy)
- [x] P0 behavior has test matrix coverage
- [x] Evidence type is identified for each P0 case

## Complexity Tracking

（两个 gate 均 PASS，无违例需要辩护。）

## Architecture Impact

- Product control impact: 新产品，从零建立。
- Platform core impact: 无（无后端）。
- Client adapter impact: viewer / content script / sidepanel / options 四个 chrome 入口。
- Provider adapter impact: AnthropicProvider + OpenAICompatProvider；CompanionProvider 仅接口预留。
- Governance impact: constitution v1.0.0 初版生效。

## Directory Impact

| Path | Layer | Action | Reason |
|---|---|---|---|
| `shared/` | 纯逻辑 | create | types/messages/presets/settings/sse/prompts/sentence |
| `providers/` | 纯逻辑 | create | provider.ts / openai-compat.ts / anthropic.ts |
| `sidepanel-lib/` | 纯逻辑 | create | sessions.ts（IndexedDB，fake-indexeddb 可测） |
| `entrypoints/` | chrome 胶水 | create | background.ts / content.ts / viewer/ / sidepanel/ / options/ |
| `tests/` | 测试 | create | vitest 单测 |
| `wxt.config.ts` 等 | 配置 | create | WXT/manifest/tsconfig/vitest |

## Test Strategy

- Unit（artifact evidence）: settings 合并、SSE 跨 chunk、openai-compat/anthropic 流式与错误、prompts 截断与组装、sentence 扩句、sessions 存取。
- Contract/capture: Provider 测试用 mock fetch + 仿真 SSE 报文（capture 级证据）。
- True integration: 手工验收清单（arXiv PDF / file:// PDF / HTML 三来源），记录于 TEST_REPORT。

## Risks

- pdfjs-dist 版本 API 漂移（TextLayer 构造签名）→ 锁版本，build 后手工验证。
- MV3 SW 空闲回收导致 papers 缓存丢失 → 页面侧重新上报即可恢复（已在数据流设计中）。
- arXiv 等站点响应头变化影响嗅探 → 逃生入口 + file 后缀兜底。
