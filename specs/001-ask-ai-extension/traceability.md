# ask-ai-extension Traceability

**Feature Branch**: `001-ask-ai-extension`
**Source**: `specs/001-ask-ai-extension/prd-source.md`

## PRD to Delivery Map

| Source ID | PRD Section | Requirement | User Story | Test Case | Task | Status |
|---|---|---|---|---|---|---|
| PRD-S001 | 产品定位 | FR-001..009 | US1/US2 | TC-001..008 | T003..T013 | planned |
| PRD-S002 | 点击翻译 | FR-001..004 | US1 | TC-005(sentence), TC-006(prompts), 手工 M1/M2 | T008,T007,T010,T012 | planned |
| PRD-S003 | 整篇论文讨论 | FR-005..006 | US2 | TC-006(截断), 手工 M3 | T007,T009,T010,T011,T012 | planned |
| PRD-S004 | 多模型切换 | FR-007..008 | US3 | TC-002(settings),TC-003,TC-004 | T003,T005,T006,T012,T013 | planned |
| PRD-S005 | 会话管理 | FR-009 | US4 | TC-007(sessions), 手工 M4 | T014(=sessions),T012 | planned |
| PRD-S006 | 论文来源 | FR-010 | US1/US2 | 手工 M1/M5/M6 | T009,T010,T011 | planned |
| PRD-S007 | 架构 | plan.md 约束 | — | tsc/build TC-008 | 全部 | planned |
| PRD-S008 | 错误处理 | FR-011 | US1..US4 | TC-003(401), 手工 M7 | T005,T012 | planned |
| PRD-S009 | 测试策略 | SC-002 | — | TC-001..008 | T003..T008,T014 | planned |
| PRD-S010 | 分期边界 | Non-Goal | — | — | provider.ts 接口注释 | deferred |

## Coverage Rules

- Every PRD-S row must map to one or more FR, SC, non-goal, assumption, or explicit out-of-scope note. ✅
- P0 PRD sections must map to at least one TC and evidence ref. ✅（见 TEST_MATRIX）
- Any unmapped PRD section must be marked `out-of-scope`, `duplicate`, or `deferred` with rationale. ✅（PRD-S010 deferred=二期）
