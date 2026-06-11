# ask-ai-extension Quickstart

**Feature Branch**: `001-ask-ai-extension`

## Prerequisites

- Node.js ≥ 18，Chrome ≥ 120

## Run

```bash
npm install
npm run build          # 产出 .output/chrome-mv3/
```

Chrome → `chrome://extensions` → 开发者模式 → "加载已解压的扩展程序" → 选 `.output/chrome-mv3/`。
本地 PDF 场景需在该扩展详情页开启"允许访问文件网址"。

## Validate

| Step | Command / 操作 | Expected |
|---|---|---|
| 1 | `npm test` | 全部测试 PASS |
| 2 | `npx tsc --noEmit` | 零错误 |
| 3 | 打开 `https://arxiv.org/pdf/1706.03762` | 跳转扩展 viewer，PDF 渲染 |
| 4 | Options 页填 API key 后单击正文一行 | 侧边栏翻译卡片流式出中文 |
| 5 | 侧边栏提问"主要贡献？" | 基于全文的回答流式返回 |
| 6 | 打开 arXiv HTML 版，Alt+单击段落 | 同步骤 4 |
| 7 | 重开同一论文 | 历史会话恢复 |
