# V0.1 Test Matrix

| Case | Requirement | Capability | Stage | Evidence Type | Priority | Acceptance | Evidence Ref |
|---|---|---|---|---|---|---|---|
| TC-001 | FR-008 | SSE 解析（完整/跨 chunk/注释行） | unit | artifact | P0 | tests/sse.test.ts 全 PASS | quality/V0.1/evidence/unit-tests.txt |
| TC-002 | FR-007 | 设置默认值/保存/预设合并 | unit | artifact | P0 | tests/settings.test.ts 全 PASS | quality/V0.1/evidence/unit-tests.txt |
| TC-003 | FR-008,FR-011 | OpenAI 兼容流式拼接 + 401 ProviderError | contract | capture | P0 | tests/openai-compat.test.ts 全 PASS | quality/V0.1/evidence/unit-tests.txt |
| TC-004 | FR-008 | Anthropic 流式 + system 提升 + 专有头 | contract | capture | P0 | tests/anthropic.test.ts 全 PASS | quality/V0.1/evidence/unit-tests.txt |
| TC-005 | FR-001 | 句子边界扩展（中西文/连字符/文首） | unit | artifact | P0 | tests/sentence.test.ts 全 PASS | quality/V0.1/evidence/unit-tests.txt |
| TC-006 | FR-004,FR-006 | 提示词组装 + 全文头尾截断 | unit | artifact | P0 | tests/prompts.test.ts 全 PASS | quality/V0.1/evidence/unit-tests.txt |
| TC-007 | FR-009 | 会话 IndexedDB 存取恢复 | unit | artifact | P0 | tests/sessions.test.ts 全 PASS | quality/V0.1/evidence/unit-tests.txt |
| TC-008 | PRD-S007 | tsc 零错误 + wxt build 产出 MV3 | build | artifact | P0 | tsc --noEmit 退出 0；manifest.json 含 side_panel | quality/V0.1/evidence/build.txt |
| M1 | FR-010,FR-001 | arXiv PDF 点击翻译 | manual | true-integration | P0 | 手工：卡片流式中文 | quality/V0.1/TEST_REPORT.md |
| M2 | FR-002,FR-003 | PDF 划选翻译 + 追问 | manual | true-integration | P0 | 手工 | quality/V0.1/TEST_REPORT.md |
| M3 | FR-005,FR-006 | 整篇讨论（PDF/HTML） | manual | true-integration | P0 | 手工 | quality/V0.1/TEST_REPORT.md |
| M4 | FR-009 | 标签切换跟随 + 重开恢复 | manual | true-integration | P1 | 手工 | quality/V0.1/TEST_REPORT.md |
| M5 | FR-010 | 本地 file:// PDF | manual | true-integration | P1 | 手工（需开文件访问权限） | quality/V0.1/TEST_REPORT.md |
| M6 | FR-010 | HTML 页 Alt+单击 | manual | true-integration | P0 | 手工 | quality/V0.1/TEST_REPORT.md |
| M7 | FR-011 | 401 去设置 / 429 重试 / 断流标记 / 扫描版横幅 | manual | true-integration | P1 | 手工 | quality/V0.1/TEST_REPORT.md |
