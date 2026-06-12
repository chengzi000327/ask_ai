# V0.1 Release Gate

- [x] Required platform reports present
- [x] Automated P0 cases pass
- [x] PASS cases have positive assertions
- [x] Evidence refs are readable
- [x] Fresh verification commands were run before completion claims
- [x] Secret scan passed: no real secrets found; fixture strings are documented in `secret-scan.txt`
- [x] Untested scope documented
- [x] Worktree clean after final gate commit (verified 2026-06-12: `git status` clean at `a673bf0`, re-verified after fresh baseline)
- [ ] True-integration P0 manual cases pass: M1, M2, M3, M6 are pending-user

## Fresh Verification (2026-06-12 resume baseline)

- `npm test`: 22/22 passed (7 files)
- `npm run compile`: PASS (tsc --noEmit, no errors)
- `npm run build`: PASS (.output/chrome-mv3, 3.1 MB)

## Decision

Not release-ready yet. Automated quality gate is green and re-verified on 2026-06-12; browser manual P0 true-integration cases (M1, M2, M3, M6) remain pending-user. See `specs/001-ask-ai-extension/quickstart.md` for manual verification steps.
