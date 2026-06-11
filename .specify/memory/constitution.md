# ask_ai Constitution

- Version: 1.0.0
- Ratified: 2026-06-11
- Last Amended: 2026-06-11

## Principles

### P1. 本地优先，无后端
所有数据（API key、会话历史、设置）只存用户本机（chrome.storage.local / IndexedDB）。不引入任何服务器组件；论文全文仅存内存，不持久化。

### P2. 纯逻辑与平台 API 分层
`shared/` 与 `providers/` 不得 import 任何 `chrome.*` API（依赖注入除外，如 StorageLike），保证可在 node 环境单测。`entrypoints/` 才允许触碰浏览器 API。

### P3. TDD 覆盖纯逻辑
`shared/`、`providers/`、`sidepanel-lib/` 的每个模块先写失败测试（RED）再实现（GREEN）。UI 与 chrome API 胶水层不要求自动化测试，用手工验收清单覆盖。

### P4. Provider 统一契约
所有模型接入实现 `Provider.chat(opts) -> Promise<string>` 流式契约；新增模型供应商只允许通过新增 ProviderConfig 预设或新 Provider 实现，不得修改调用方。二期 CompanionProvider 仅预留接口。

### P5. TypeScript strict，错误显式化
tsconfig `strict: true`；网络/解析错误必须转为带状态码的 ProviderError 向 UI 传递，禁止静默吞错。

### P6. Evidence before claims
任何"完成/通过/可发布"结论必须引用当次 session 的 fresh verification 输出（npm test / tsc / wxt build）。

## Governance

- 修改原则需提升版本号（语义化：破坏性 MAJOR、新增 MINOR、措辞 PATCH）并记录于本文件。
- plan 阶段执行两次 Constitution Check（pre-research / post-design）；违规必须进 plan.md 的 Complexity Tracking 表辩护。
