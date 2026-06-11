# ask-ai-extension Contracts

**Feature Branch**: `001-ask-ai-extension`

External API, event, file, and adapter contracts for the implementation.

## Contract Inventory

| Contract | Requirement | Producer | Consumer | Evidence |
|---|---|---|---|---|
| `messages.md` `TRANSLATE_REQUEST` | FR-001, FR-002, FR-004 | viewer/content | background/sidepanel | M1, M2, M6 |
| `messages.md` `TRANSLATE_PUSH` | FR-003, FR-011 | background | sidepanel | M1, M2, M7 |
| `messages.md` `PAPER_LOADED` / `GET_PAPER` | FR-005, FR-006 | viewer/content/background | background/sidepanel | M3 |
| `messages.md` chat Port | FR-003, FR-006, FR-008, FR-011 | sidepanel/background | background/sidepanel | TC-003, TC-004, M3, M7 |
| `provider.md` `Provider.chat` | FR-008, FR-011 | providers | background | TC-003, TC-004 |
| `provider.md` OpenAI-compatible SSE | FR-007, FR-008 | upstream providers | `OpenAICompatProvider` | TC-003 |
| `provider.md` Anthropic SSE | FR-008 | Anthropic API | `AnthropicProvider` | TC-004 |

## Compatibility Notes

- `shared/` and `providers/` remain browser-API-free and are verified in node-based Vitest tests.
- Chrome-only entrypoints consume the message contracts and translate UI/platform errors into typed events.
