# ask-ai-extension Requirement Checklist

**Feature Branch**: `001-ask-ai-extension`

## Spec Quality

- [x] PRD source is preserved in `prd-source.md`
- [x] PRD sections are mapped in `traceability.md`
- [x] No unresolved placeholder or clarification markers
- [x] User stories are independently testable
- [x] Acceptance scenarios use Given/When/Then
- [x] Success criteria are measurable

- [x] Remaining clarification markers are zero before plan
- [x] Assumptions and edge cases are explicitly recorded

## Plan Quality

- [x] Constitution Check passed at both gates (pre-research, post-design)
- [x] All constitution violations are justified in Complexity Tracking

- [x] Architecture impact covers product control, platform core, client adapters, provider adapters, and governance
- [x] Directory impact names exact paths
- [x] Research decisions are captured in `research.md`
- [x] Data model entities are captured in `data-model.md`
- [x] Contracts are captured in `contracts/`

## Task Quality

- [x] Tasks are grouped by setup, foundation, user story, and polish phases
- [x] Parallel tasks are marked `[P]`
- [x] Each code-changing task includes RED/GREEN verification
- [x] Each P0 requirement maps to a test case and evidence ref
