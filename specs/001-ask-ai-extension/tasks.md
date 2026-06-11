# ask-ai-extension Implementation Plan

> Agentic workers must execute this plan task-by-task. Do not skip verification. Evidence before claims.

**Goal:** 论文阅读 AI 助手 Chrome 扩展一期：PDF.js 接管 PDF 实现点击/划选翻译，Side Panel 聊天讨论整篇论文，7 家预设 + 自定义端点 API key 接入。

**Architecture:** MV3 + Side Panel 唯一聊天宿主；扩展自带 PDF.js viewer 接管 PDF；background 承担 PDF 重定向、Provider SSE 流式调用（chat Port）与论文缓存；HTML 页走 content script。

**Tech Stack:** TypeScript / React / WXT / pdfjs-dist / idb / vitest

## TDD Rule

- Expected: FAIL means the named verification command fails for the missing behavior before implementation.
- Expected: PASS means the same focused command passes after the minimal implementation, followed by the task's listed fresh verification.

---

## Dependencies

- T001-T002（Setup）→ T003（types/messages 是一切的地基）→ T004..T008 纯逻辑层 → T009 background → T010/T011 页面层 → T012/T013 UI → T015 验证收尾。
- 顺序自执行模式（本环境不派 subagent），`[P]` 标记仅表示文件互不相交、逻辑上可并行。

## Parallel Ownership

| Parallel Group | Agent Role | Task IDs | Owned Files | Blocked By |
|---|---|---|---|---|
| PG-001 | self | T004,T005a,T007,T008,T014 | shared/settings* shared/sse* shared/prompts* shared/sentence* sidepanel-lib/* | T003 |
| PG-002 | self | T005,T006 | providers/* | T005a(sse) |

## Phase 1: Setup

- [x] T001 git 仓库 + 分支 `001-ask-ai-extension`（已完成于 scaffold 阶段）。Evidence: `git branch --show-current` -> `001-ask-ai-extension`。
- [x] T002 WXT 脚手架（FR-010, SC-003, TC-008）：npm 依赖、`wxt.config.ts`、`tsconfig.json`、`vitest.config.ts`、`.gitignore`、最小 background/content/viewer/sidepanel/options 入口。RED: `npm run build` 在脚手架缺失时失败。GREEN: `npm run build` 退出 0 且 `.output/chrome-mv3/manifest.json` 含 `side_panel.default_path`；`npm run compile` 退出 0。Evidence: `quality/V0.1/evidence/build.txt`, `quality/V0.1/evidence/tsc.txt`。Commit `chore: WXT scaffold`。

## Phase 2: Foundation（纯逻辑层，全 TDD）

- [x] T003 `shared/types.ts` + `shared/messages.ts`（FR-001..FR-011, TC-008）：定义 ProviderConfig/Settings/PaperContext/ChatMessage/TranslatePayload/BusMessage/ChatPortEvent（含 TRANSLATE_PUSH）。Expected: FAIL before shared contracts exist. Expected: PASS after contracts compile. GREEN: `npm run compile` 通过。Evidence: `quality/V0.1/evidence/tsc.txt`。Commit。
- [x] T004 [P] `shared/presets.ts`（7 家）+ `shared/settings.ts`（StorageLike 注入、预设合并）（FR-007, TC-002）。Expected: FAIL before `shared/settings.ts` exists. Expected: PASS after presets/settings implementation. RED: `tests/settings.test.ts`（默认值/保存读回/合并补齐）失败 → GREEN: `npm test -- tests/settings.test.ts` 通过。Evidence: `quality/V0.1/evidence/unit-tests.txt`。Commit。
- [x] T005a [P] `shared/sse.ts`（FR-008, TC-001）。Expected: FAIL before `shared/sse.ts` exists. Expected: PASS after streaming parser implementation. RED: `tests/sse.test.ts`（完整事件/跨 chunk 重组/注释与 event 行忽略）失败 → GREEN: `npm test -- tests/sse.test.ts` 通过。Evidence: `quality/V0.1/evidence/unit-tests.txt`。Commit。
- [x] T005 `providers/provider.ts` + `providers/openai-compat.ts`（FR-007, FR-008, FR-011, TC-003）。Expected: FAIL before provider modules exist. Expected: PASS after OpenAI-compatible provider implementation. RED: `tests/openai-compat.test.ts`（流式拼接 delta、URL/头/stream 断言、401 ProviderError）失败 → GREEN: `npm test -- tests/openai-compat.test.ts` 通过。Evidence: `quality/V0.1/evidence/unit-tests.txt`。Commit。
- [x] T006 `providers/anthropic.ts`（FR-008, FR-011, TC-004）。Expected: FAIL before `providers/anthropic.ts` exists. Expected: PASS after Anthropic provider implementation. RED: `tests/anthropic.test.ts`（content_block_delta 解析、system 提升、x-api-key/version/direct-browser-access 头）失败 → GREEN: `npm test -- tests/anthropic.test.ts` 通过。Evidence: `quality/V0.1/evidence/unit-tests.txt`。Commit。
- [ ] T007 [P] `shared/prompts.ts`（FR-004, FR-006, TC-006）。RED: `tests/prompts.test.ts`（不超预算原样、头 60% 尾 40% + 省略标记、翻译消息含标题/上下文/目标语言、讨论消息 system 含全文）失败 → GREEN: `npm test -- tests/prompts.test.ts` 通过。Evidence: `quality/V0.1/evidence/unit-tests.txt`。Commit。
- [ ] T008 [P] `shared/sentence.ts`（FR-001, TC-005）。RED: `tests/sentence.test.ts`（中间行扩句、文首无边界、连字符跨行合并、中文句号）失败 → GREEN: `npm test -- tests/sentence.test.ts` 通过。Evidence: `quality/V0.1/evidence/unit-tests.txt`。Commit。
- [ ] T014 [P] `sidepanel-lib/sessions.ts`（FR-009, TC-007）。RED: `tests/sessions.test.ts`（fake-indexeddb：不存在返回 null、保存读回、upsert 更新）失败 → GREEN: `npm test -- tests/sessions.test.ts` 通过。Evidence: `quality/V0.1/evidence/unit-tests.txt`。Commit。

## Phase 3: User Story 1+2 - 翻译与讨论管道（P1）

**Goal:** 点击/划选 → 卡片流式翻译；全文讨论。
**Independent Test:** quickstart M1/M2/M3。

- [ ] T009 `entrypoints/background.ts`（FR-003, FR-005, FR-006, FR-008, FR-010, FR-011, TC-008, M1, M3, M7）：webRequest 嗅探 PDF → tabs.update 重定向 viewer；file:// 后缀兜底；papers 内存缓存；pendingTranslate 缓存 + TRANSLATE_PUSH 广播 + sidePanel.open；chat Port（loadSettings → Provider 分发 → delta/done/error 推送，断开即 abort）。GREEN: `npx tsc --noEmit` + `npm run build`。Commit。
- [ ] T010 `entrypoints/viewer/`（FR-001, FR-002, FR-005, FR-010, FR-011, TC-005, M1, M2, M5）：PDF.js 渲染 canvas + TextLayer；单击行 → expandToSentence → TRANSLATE_REQUEST（带前后 8 行上下文）；mouseup 划选；后台全文抽取 → PAPER_LOADED；无文本层横幅；"用原生查看器打开"（BYPASS_PDF）。wxt hook 拷贝 pdf.worker。GREEN: build 后手工 M1/M2/M5。Commit。
- [ ] T011 `entrypoints/content.ts`（FR-002, FR-005, FR-010, M3, M6）：HTML 页 PAPER_LOADED 正文抽取（article/main 优先）；Alt+单击段落 + 划选 → TRANSLATE_REQUEST。GREEN: `npx tsc --noEmit` + 手工 M6。Commit。

## Phase 4: User Story 3+4 - UI 层（P1/P2）

- [ ] T012 `entrypoints/sidepanel/`（FR-003, FR-006, FR-008, FR-009, FR-011, M1, M3, M4, M7）：App.tsx 聊天流（翻译卡片原文引用 + 流式译文、普通消息）；chat Port 客户端；TRANSLATE_PUSH 监听 + GET_PENDING_TRANSLATE 启动取件；模型下拉（仅点亮已配 key 的）；错误态（auth → 去设置按钮；retryable → 重试；断流 → 已中断标记 + 重试）；tabs.onActivated 跟随 + sessions 持久化恢复。GREEN: `npx tsc --noEmit` + `npm run build`。Commit。
- [ ] T013 `entrypoints/options/`（FR-007, FR-008, M7）：7 家预设 key 输入、模型名列表编辑、默认模型选择、目标语言、自定义 OpenAI 兼容端点增删。GREEN: `npx tsc --noEmit` + `npm run build`。Commit。

## Phase N: Polish and Release Evidence

- [ ] T015 全量 fresh verification（FR-001..FR-011, SC-001..SC-003, TC-001..TC-008, M1..M7）：`npm test`（全绿）+ `npx tsc --noEmit` + `npm run build`；证据写入 `quality/V0.1/evidence/`；更新 TEST_REPORT.md（手工项标记 pending-user）与 RELEASE_GATE.md；`check_vibe_structure.py` 结构检查。呈现 merge/PR/keep/discard。
