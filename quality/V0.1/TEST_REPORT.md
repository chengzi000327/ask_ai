# V0.1 Test Report

## Summary

- Commit under test: `d4e3169` (initial automated run at `0dc6913`)
- Branch: `main` (developed on `001-ask-ai-extension`)
- Platform: macOS / Chrome MV3 build target / Node 25.8.1
- Result: automated checks PASS; P0 manual true-integration cases (M1/M2/M3/M6) PASS, user-verified in real Chrome with real provider keys on 2026-06-12. P1 cases M4/M5/M7 remain pending.

## Fresh Verification

| Command | Status | Evidence |
|---|---|---|
| `npm test` | PASS | `quality/V0.1/evidence/unit-tests.txt` |
| `npm run compile` | PASS | `quality/V0.1/evidence/tsc.txt` |
| `npm run build` | PASS | `quality/V0.1/evidence/build.txt` |
| `check_vibe_structure.py --json` | PASS with LOW recommendations only | `quality/V0.1/evidence/structure-check.json` |
| secret scan | PASS, no real secrets found; hits are test fixture strings/project slug | `quality/V0.1/evidence/secret-scan.txt` |

## Cases

| Case | Status | Evidence |
|---|---|---|
| TC-001 SSE parser | PASS | `quality/V0.1/evidence/unit-tests.txt` |
| TC-002 settings merge/storage | PASS | `quality/V0.1/evidence/unit-tests.txt` |
| TC-003 OpenAI-compatible provider | PASS | `quality/V0.1/evidence/unit-tests.txt` |
| TC-004 Anthropic provider | PASS | `quality/V0.1/evidence/unit-tests.txt` |
| TC-005 sentence expansion | PASS | `quality/V0.1/evidence/unit-tests.txt` |
| TC-006 prompt construction/truncation | PASS | `quality/V0.1/evidence/unit-tests.txt` |
| TC-007 IndexedDB sessions | PASS | `quality/V0.1/evidence/unit-tests.txt` |
| TC-008 TypeScript + WXT MV3 build | PASS | `quality/V0.1/evidence/tsc.txt`, `quality/V0.1/evidence/build.txt` |
| M1 arXiv PDF click translation | PASS (true-integration, user-verified 2026-06-12) | user-confirmed streaming Chinese translation in side panel; pipeline capture `quality/V0.1/evidence/smoke-browser.txt` |
| M2 PDF selection translation + follow-up | PASS (true-integration, user-verified 2026-06-12) | user-confirmed selection translation cards with source quotes |
| M3 whole-paper discussion PDF/HTML | PASS (true-integration, user-verified 2026-06-12) | user-confirmed full-text Q&A streaming in side panel |
| M4 tab-following session restore | pending-user | requires loaded extension in Chrome |
| M5 local `file://` PDF | pending-user | requires Chrome file access permission |
| M6 HTML Alt-click translation | PASS (true-integration, user-verified 2026-06-12) | user-confirmed on arxiv.org/html page; pipeline verified by Playwright (content script -> TRANSLATE_REQUEST -> side panel opened) |
| M7 auth/retry/interrupted/scanned-PDF states | pending-user (error cards observed rendering during debugging; retry/scanned-PDF paths unverified) | requires provider/browser fault injection |

## Untested Scope

- P1 manual cases M4 (tab-follow restore), M5 (local file:// PDF), M7 (full error-state matrix) not yet executed.
- Bugs found and fixed during user verification (each re-verified): side panel not opening on first click (broadcast-before-open), unbound fetch in providers, viewer line-index misalignment, model-switch wiping conversation, stale-content-script context errors.
