# Ask AI

论文阅读 AI 助手 Chrome 扩展：在 PDF 和 HTML 页面上点击/划选即可流式翻译，并支持基于全文的侧边栏讨论。

## 功能

- **PDF 翻译**：打开任意在线或本地 PDF（如 arXiv）会自动跳转到内置 PDF.js 阅读器，单击一行即翻译整句，划选任意文字也可翻译，结果带原文引用、流式输出到侧边栏。
- **HTML 页面翻译**：在普通网页上 Alt+单击段落或划选文字即可翻译。
- **整篇讨论**：侧边栏可基于当前论文/页面全文提问，回答流式返回。
- **多模型支持**：内置 7 家预设（Claude、GPT、DeepSeek、GLM、Kimi、Qwen、MiniMax），也可添加自定义 OpenAI 兼容端点；API key 在 Options 页配置，仅本地存储。
- **会话持久化**：按论文保存对话历史（IndexedDB），标签切换自动跟随，重开同一论文恢复会话。

## 快速开始

环境要求：Node.js ≥ 18，Chrome ≥ 120。

```bash
npm install
npm run build        # 产出 .output/chrome-mv3/
```

加载扩展：

1. Chrome 打开 `chrome://extensions`，开启「开发者模式」。
2. 点「加载已解压的扩展程序」，选择 `.output/chrome-mv3/` 目录。
3. 在扩展的 Options 页填入至少一家模型的 API key，选默认模型和目标语言。
4. 本地 PDF（`file://`）场景需在扩展详情页开启「允许访问文件网址」。

试用：打开 <https://arxiv.org/pdf/1706.03762>，单击正文任意一行，侧边栏即出现流式中文翻译。

## 开发

```bash
npm run dev          # WXT 开发模式（热重载）
npm test             # vitest 单元测试
npm run compile      # tsc --noEmit 类型检查
npm run build        # 生产构建
```

## 项目结构

```
entrypoints/         # WXT 入口（约定目录名，每个子项编译为扩展的一个组成部分）
  background.ts      #   后台：PDF 嗅探重定向、翻译请求分发、chat Port、模型调用
  content.ts         #   内容脚本：HTML 页正文抽取、Alt+单击/划选翻译
  viewer/            #   内置 PDF.js 阅读器页面
  sidepanel/         #   侧边栏聊天 UI（React）
  options/           #   设置页：API key、模型列表、目标语言、自定义端点
providers/           # 模型供应商适配（OpenAI 兼容 / Anthropic 原生）
shared/              # 纯逻辑层：类型、消息契约、预设、SSE 解析、提示词构建、扩句
sidepanel-lib/       # IndexedDB 会话存储
tests/               # vitest 单元测试（纯逻辑层全覆盖）
specs/               # 功能规格、计划、任务（vibe-coding-spec 工作流产物）
quality/             # 测试矩阵、测试报告、发布门禁与证据
```

技术栈：[WXT](https://wxt.dev)（MV3 扩展框架）+ React 19 + PDF.js + TypeScript + Vitest。

## 隐私

API key 与会话记录仅存储在浏览器本地（`chrome.storage` / IndexedDB），翻译与讨论请求直接从浏览器发往你配置的模型服务商，无任何中间服务器。
