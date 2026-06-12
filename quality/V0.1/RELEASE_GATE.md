# V0.1 Release Gate

- [x] Required platform reports present
- [x] Automated P0 cases pass
- [x] PASS cases have positive assertions
- [x] Evidence refs are readable
- [x] Fresh verification commands were run before completion claims
- [x] Secret scan passed: no real secrets found; fixture strings are documented in `secret-scan.txt`
- [x] Untested scope documented
- [x] Worktree clean after final gate commit (verified 2026-06-12: `git status` clean at `a673bf0`, re-verified after fresh baseline)
- [x] True-integration P0 manual cases pass: M1, M2, M3, M6 user-verified in real Chrome with real provider keys (2026-06-12, see TEST_REPORT.md)

## Fresh Verification (2026-06-12, re-run after each fix through `d4e3169`)

- `npm test`: 22/22 passed (7 files)
- `npm run compile`: PASS (tsc --noEmit, no errors)
- `npm run build`: PASS (.output/chrome-mv3, 3.11 MB)
- Playwright real-browser smoke: PDF redirect -> text layer -> click -> TRANSLATE_REQUEST -> side panel opened (`evidence/smoke-browser.txt`); HTML Alt-click pipeline likewise verified

## Decision

**Release-ready (V0.1).** Automated gate green; all P0 true-integration manual cases pass. Residual risk: P1 cases M4 (tab-follow restore), M5 (local file:// PDF), M7 (full error-state matrix) untested — track for V0.2.
