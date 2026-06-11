# Feature Specification: ask-ai-extension

**Feature Branch**: `001-ask-ai-extension`
**Status**: Approved（设计已由用户逐节确认并于 2026-06-11 重新下达实现指令）
**Input**: `prd-source.md`（PRD-S001..S010）

## Source Normalization

| Source | Traceability |
|---|---|
| `specs/001-ask-ai-extension/prd-source.md` | `specs/001-ask-ai-extension/traceability.md` |

## Scope

- In scope: 一期扩展本体——PDF/HTML 论文的点击与划选翻译、全文上下文讨论、7 家预设 + 自定义端点的 API key 接入、按论文 URL 的会话持久化、设置页。
- Out of scope（Non-Goals）: 二期 Claude 订阅伴随程序（仅留 Provider 接口）；OCR；悬停即译；原文旁浮层翻译；浏览器端到端测试；Chrome 之外的浏览器。
- Conflicts: 无。

## User Scenarios & Testing

### User Story 1 - 点击/划选即时翻译（Priority: P1）

研究者在 arXiv 打开一篇 PDF 论文，扩展接管渲染；单击正文某行，系统将其扩展为完整句子并连同上下文发往侧边栏，侧边栏插入翻译卡片（原文引用 + 流式译文）；划选一段文字亦然；用户可在聊天流中对译文直接追问。

**Why this priority**: 这是产品核心交互，PRD-S002 首要场景。

**Independent Test**: 打开 arXiv PDF → 单击一行 → 侧边栏出现卡片且译文流式增长。

**Acceptance Scenarios**:

1. **Given** 已配置某模型 API key 且打开 arXiv PDF，**When** 单击正文中一行，**Then** 侧边栏出现翻译卡片，原文为扩句后的完整句子，译文流式渲染为中文。
2. **Given** 同上，**When** 划选两句话，**Then** 卡片原文为所选文本。
3. **Given** 译文已完成，**When** 在输入框追问"这句里的 attention 指什么"，**Then** AI 基于论文上下文回答。

### User Story 2 - 整篇论文讨论（Priority: P1）

打开论文后全文被后台抽取缓存；用户在侧边栏提问，系统组装【论文全文 + 历史对话 + 问题】发给当前模型，流式返回。

**Acceptance Scenarios**:

1. **Given** 已打开论文且全文抽取完成，**When** 提问"这篇论文的主要贡献是什么"，**Then** 回答内容引用论文实际内容。
2. **Given** 论文超长（超出字符预算），**When** 提问，**Then** 发送的全文保留头部（摘要/引言）与尾部（结论），中间打省略标记。

### User Story 3 - 多模型切换（Priority: P2）

设置页填入任一预设的 API key 即点亮该家模型；侧边栏顶部下拉切换，仅影响后续消息；可添加任意 OpenAI 兼容自定义端点。

**Acceptance Scenarios**:

1. **Given** 配好 DeepSeek 和 Claude 两家 key，**When** 下拉切换模型后发消息，**Then** 请求发往新模型，此前历史保留。
2. **Given** 添加了自定义 OpenAI 兼容端点，**When** 选择它发消息，**Then** 请求发往自定义 baseUrl。

### User Story 4 - 会话持久化与跟随（Priority: P2）

每篇论文（按 URL）独立会话存 IndexedDB；切换标签页后 1 秒内侧边栏切到对应会话；重开同一论文恢复历史。

**Acceptance Scenarios**:

1. **Given** 在论文 A 有 3 条对话，**When** 切到论文 B 的标签页再切回 A，**Then** 侧边栏显示 A 的 3 条历史。
2. **Given** 关闭论文 A 的标签页后重新打开同一 URL，**Then** 历史恢复。

### Edge Cases

- What happens when API key 未配置或返回 401？→ 卡片内提示 + "去设置"按钮（FR-011）。
- What happens when 接口返回 429 或请求超时？→ 显示重试按钮，点击后重发同一请求。
- What happens when SSE 流中途断开？→ 保留已收到部分并标记"已中断"，提供重试。
- What happens when PDF 是扫描版（无文本层）？→ 顶部横幅提示点击翻译不可用，聊天仍可用。
- What happens when 非论文 PDF 被误接管？→ 工具栏"用原生查看器打开"逃生入口，本次放行。
- What happens when 侧边栏尚未打开时用户点击了正文？→ background 缓存待处理翻译请求并尝试打开侧边栏，侧边栏启动后取走执行。
- What happens when 普通网页上单击会干扰页面自身交互？→ HTML 页采用 Alt+单击触发段落翻译（见 Assumptions A2）。

## Requirements

### Functional Requirements

- **FR-001**: PDF 阅读器页内单击 text layer 某行时，系统必须将该行向前后扩展至句子边界（支持中西文句号、跨行连字符合并）得到完整句子。
- **FR-002**: PDF 页与 HTML 页均支持划选文字触发翻译，所选文本即原文。
- **FR-003**: 翻译结果以卡片形式插入侧边栏聊天流：先渲染原文引用，译文流式追加；卡片在聊天流中可被追问。
- **FR-004**: 翻译提示词必须携带论文标题与邻近上下文，目标语言取设置（默认中文）。
- **FR-005**: 打开 PDF 时阅读器页抽取全文上报 background 缓存（内存）；HTML 页由 content script 抽正文上报。
- **FR-006**: 讨论消息组装为【system: 论文全文（超预算时头 60% + 尾 40% + 省略标记）】+ 历史 + 新问题。
- **FR-007**: 内置 7 家预设（Claude/GPT/DeepSeek/GLM/Kimi/Qwen/MiniMax），apiKey 非空即可用；支持添加 OpenAI 兼容自定义端点。
- **FR-008**: 侧边栏顶部模型下拉实时切换，仅影响后续消息；Claude 走 Anthropic Messages API，其余走 OpenAI 兼容 /chat/completions，均流式。
- **FR-009**: 会话按论文 URL 存 IndexedDB；标签页切换后 1 秒内侧边栏加载对应会话；重开恢复。
- **FR-010**: 支持四类来源：arXiv PDF、任意网站 PDF（Content-Type 嗅探接管）、本地 file:// PDF（后缀判断，需用户在扩展设置中开启文件访问权限）、HTML 论文页。
- **FR-011**: 错误处理按 PRD-S008 执行：401/未配置 → 提示 + 去设置；429/超时 → 重试按钮；断流 → 保留部分 + "已中断"标记；扫描版 → 横幅降级提示。

### Key Entities

见 `data-model.md`：ProviderConfig、Settings、PaperContext、ChatMessage、Session、TranslatePayload。

## Success Criteria

- **SC-001**: arXiv PDF / 本地 PDF / HTML 三类来源各能完整跑通"点击(或 Alt+点击)翻译 + 划选翻译 + 整篇讨论"手工验收清单。
- **SC-002**: `npm test` 全绿，覆盖 Provider 层、SSE 解析、句子边界、提示词截断、设置合并、会话存储。
- **SC-003**: `npx tsc --noEmit` 零错误；`npm run build` 产出可加载的 `.output/chrome-mv3/`。

## Assumptions

- **A1**: 模型预设的默认模型名以实现日主流可用版本写死，设置页可改——模型名变化不视为需求变更。
- **A2**: 普通网页裸单击会与页面交互冲突，HTML 页改用 **Alt+单击** 触发段落翻译（PDF 阅读器是自有页面，保持裸单击）。此为对 PRD-S002 的受控偏差，已在前次设计评审记录。
- **A3**: "用户最近点击过的章节优先"的截断增强（PRD-S003 后半句）一期实现为头尾保留策略，点击章节优先作为 backlog 不阻塞验收。
- **A4**: API key 以明文存 chrome.storage.local（本地扩展存储常规水位），不做额外加密——无后端可托管密钥。
- **A5**: webRequest 仅用于读取响应头嗅探 PDF（观察用途），重定向用 chrome.tabs.update 完成，不需要 blocking 权限。
