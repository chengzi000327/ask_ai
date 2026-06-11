# ask-ai-extension Clarifications

**Feature Branch**: `001-ask-ai-extension`

## Open Questions

（无——设计文档此前已与用户逐节确认通过，本轮用户重新提供需求并直接下达实现指令。）

## Blocking Questions

（无）

## PRD-Derived Ambiguities

| Source ID | Ambiguity | Blocking? | Proposed Handling |
|---|---|---|---|
| PRD-S002 | HTML 页裸单击与页面交互冲突 | no | 采用 Alt+单击，记入 spec Assumptions A2 |
| PRD-S003 | "最近点击章节优先"截断细则 | no | 一期头尾保留策略，A3 记为 backlog |
| PRD-S004 | 各家预设默认模型名 | no | A1：写死实现日主流版本，设置页可改 |

## Resolved Clarifications

| Date | Question | Answer | Impacted Artifact |
|---|---|---|---|
| 2026-06-11 | 九类扫描（功能边界/数据/UX/性能/安全/集成/部署/测试/术语） | 全部由既有已确认设计覆盖，无新增阻塞项 | spec.md |
| 2026-06-11 | 翻译展示位置（浮层 vs 聊天流） | 聊天流卡片（前次设计决策 #3） | spec.md FR-003 |
| 2026-06-11 | PDF 渲染方式 | 扩展自带 PDF.js 接管（原生查看器对扩展封闭，决策 #1/#5） | plan.md |
| 2026-06-11 | 模型接入方式 | 一期全 API key，二期才走 Agent SDK（决策 #4） | spec.md Non-Goals |

## Coverage Summary

九类覆盖扫描结论：Functional ✅ / Data ✅ / UX ✅ / Performance ✅（流式 + 截断预算）/ Security ✅（A4 本地明文，无后端）/ Integration ✅（7 家 + 自定义端点契约）/ Deployment ✅（本地 build + 手动加载）/ Testing ✅（PRD-S009）/ Terminology ✅。Blocking = 0。
