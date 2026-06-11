# ask-ai-extension PRD Source

**Feature Branch**: `001-ask-ai-extension`
**Original PRD**: 用户于 2026-06-11 在会话中提供的已确认需求（此前经逐节确认的设计文档复述版），原文逐字保留。

## PRD-S001 产品定位

一个 Manifest V3 Chrome 扩展，面向论文阅读场景：打开论文（PDF 或 HTML）时右侧出现 AI 聊天侧边栏（Chrome Side Panel），点击或划选正文即时翻译（默认译为中文），并可携带论文全文上下文与 AI 持续讨论整篇论文。

## PRD-S002 点击翻译

在 PDF 中单击某行，自动智能扩展为完整句子（PDF 单行常是半句，向前后延伸至句号边界）；也支持划选任意文字。翻译结果以卡片形式（原文引用 + 译文）流式渲染进侧边栏聊天流，可直接追问。提示词携带论文标题和邻近上下文以提升术语准确性。

## PRD-S003 整篇论文讨论

打开 PDF 时后台用 PDF.js 抽取全文，HTML 页由 content script 抽正文；提问时组装【论文全文 + 历史对话 + 问题】发给模型。超长截断策略：保留摘要/引言/结论，用户最近点击的章节优先。

## PRD-S004 多模型切换

内置 7 家预设（Claude、GPT、DeepSeek、智谱 GLM、Kimi、通义千问、MiniMax），填 API key 即点亮；支持任意 OpenAI 兼容自定义端点。侧边栏顶部下拉随时切换，仅影响后续消息。

## PRD-S005 会话管理

每篇论文（按 URL）一个独立会话，存 IndexedDB；切换标签页时侧边栏自动跟随；重开同一论文恢复历史讨论。

## PRD-S006 支持的论文来源

arXiv PDF（首要）、任意网站 PDF、本地 PDF（file://，需授权）、HTML 网页论文。

## PRD-S007 架构（5 个组件）

TypeScript + React + WXT + PDF.js，无后端，数据全本地：
- PDF.js 阅读器页：接管所有 PDF 渲染（Chrome 原生查看器对扩展封闭），text layer 实现行级点击，提供"用原生查看器打开"逃生入口
- Content script：仅处理普通网页的点击/划选与正文抽取
- Side Panel：唯一聊天宿主，翻译卡片 + 模型下拉 + 输入框
- Background Service Worker：PDF 导航重定向、Provider 层 LLM 流式调用（fetch + SSE，经长连接 Port 推送）、会话与设置存储
- Options 设置页：API key、默认模型、目标语言（默认中文）

## PRD-S008 错误处理

key 未配置/401 → 卡片内提示 + 去设置按钮；429/超时 → 重试按钮；断流 → 保留已收部分并标记"已中断"；扫描版 PDF → 提示点击翻译不可用但聊天可用（一期不做 OCR）。

## PRD-S009 测试策略

vitest 单测覆盖 Provider 层、SSE 解析、句子边界算法；arXiv PDF / 本地 PDF / HTML 三类来源手工验收；不引入浏览器自动化。

## PRD-S010 分期边界

一期全部模型走 API key；二期（仅预留 Provider 接口，不实现）经本地 Node 伴随程序 + Claude Agent SDK 使用 Claude 订阅额度。

## Source Index

| Source ID | Section | Normalized Into | Notes |
|---|---|---|---|
| PRD-S001 | 产品定位 | spec.md US1/US2 | |
| PRD-S002 | 点击翻译 | spec.md US1, FR-001..004 | |
| PRD-S003 | 整篇论文讨论 | spec.md US2, FR-005..006 | |
| PRD-S004 | 多模型切换 | spec.md US3, FR-007..008 | |
| PRD-S005 | 会话管理 | spec.md US4, FR-009 | |
| PRD-S006 | 论文来源 | spec.md FR-010 | |
| PRD-S007 | 架构 | plan.md | 实现层约束 |
| PRD-S008 | 错误处理 | spec.md FR-011, Edge Cases | |
| PRD-S009 | 测试策略 | plan.md Test Strategy, TEST_MATRIX | |
| PRD-S010 | 分期边界 | spec.md Non-Goals | 二期 out-of-scope |
