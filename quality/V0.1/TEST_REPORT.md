# V0.1 Test Report

## Summary

- Commit under test: `0dc6913`
- Branch: `001-ask-ai-extension`
- Platform: macOS / Chrome MV3 build target / Node 25.8.1
- Result: automated checks PASS; browser manual true-integration cases pending-user.

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
| M1 arXiv PDF click translation | pending-user | requires loaded extension in Chrome |
| M2 PDF selection translation + follow-up | pending-user | requires loaded extension in Chrome |
| M3 whole-paper discussion PDF/HTML | pending-user | requires loaded extension in Chrome |
| M4 tab-following session restore | pending-user | requires loaded extension in Chrome |
| M5 local `file://` PDF | pending-user | requires Chrome file access permission |
| M6 HTML Alt-click translation | pending-user | requires loaded extension in Chrome |
| M7 auth/retry/interrupted/scanned-PDF states | pending-user | requires provider/browser fault injection |

## Untested Scope

- Browser true-integration flows M1-M7 were not executed in this terminal session.
- Real provider calls were not made; provider tests use mocked SSE/capture fixtures.
