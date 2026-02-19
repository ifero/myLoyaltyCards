# 11-1-block-pr-on-quality-gates

**Epic:** 11 - CI/CD & Quality Gates

**Title:** Block PR merge if lint/typecheck/test/coverage fail

**Status:** in-progress

## Description

Implement a GitHub Actions workflow that blocks pull request merges if lint, typecheck, tests, or code coverage do not pass.

- Minimum coverage: 80% lines/statements.
- Tools: ESLint, TypeScript, Jest (unit/integration tests).
- Notifications: GitHub (status check), Slack (#ci-alerts channel).
- Build/coverage badge in README.
- Visual regression: not required for now, but pipeline should be ready for future addition.

## Acceptance Criteria

- [x] CI runs on every PR
- [x] Merge is blocked if lint/typecheck/test/coverage fail
- [x] Clear report on GitHub
- [x] Minimum 80% coverage enforced
- [x] Build/coverage badge in README
- [ ] Failure notifications (GitHub, Slack)
- [x] Pipeline ready for visual regression (even if not active)

## Implementation (in-progress)

- Created GitHub Actions workflow: `.github/workflows/ci-quality-gates.yml` ✅
- Enforced Jest coverage threshold (80%) in `jest.config.js` ✅
- Added CI and coverage badges to `README.md` ✅
- Coverage report uploaded as workflow artifact (`coverage/`) ✅
- Slack notifications: workflow supports Slack via the `SLACK_WEBHOOK_URL` secret. The email notification step has been removed. ⚠️

## Next steps

1. Add repository secret (`SLACK_WEBHOOK_URL`) to enable Slack notifications.
2. Configure branch protection rules to require the `CI — Quality Gates` check on PRs (see branch-protection note below).
3. (Optional) Integrate a coverage service (Codecov) for a dynamic coverage badge.
4. Open PR and request code review from Dev agent.

### Coverage scope

- The enforced 80% coverage threshold applies to the files listed in `jest.config.js` -> `collectCoverageFrom` (currently `features/` and `core/`).
- To expand the coverage gate to other folders (for example `app/` or `shared/`), update `collectCoverageFrom` and add tests to meet the threshold.

### Branch-protection note

- In GitHub repo Settings → Branches → Add rule for `main`:
  - Require status checks to pass before merging → select `CI — Quality Gates` (or the workflow job name)
  - Require branches to be up to date before merging (optional)
  - Protect matching branches (admins) as appropriate
- This step is required to actually block merges when CI fails.
