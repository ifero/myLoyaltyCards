# 11-1-block-pr-on-quality-gates

**Epic:** 11 - CI/CD & Quality Gates

**Title:** Block PR merge if lint/typecheck/test/coverage fail

**Status:** in-progress

## Description

Implement a GitHub Actions workflow that blocks pull request merges if lint, typecheck, tests, or code coverage do not pass.

- Minimum coverage: 80% lines/statements.
- Tools: ESLint, TypeScript, Jest (unit/integration tests).
- Notifications: GitHub (status check), Slack (#ci-alerts channel), email (dev lead).
- Build/coverage badge in README.
- Visual regression: not required for now, but pipeline should be ready for future addition.

## Acceptance Criteria

- [x] CI runs on every PR
- [x] Merge is blocked if lint/typecheck/test/coverage fail
- [x] Clear report on GitHub
- [x] Minimum 80% coverage enforced
- [x] Build/coverage badge in README
- [x] Failure notifications (GitHub, Slack, email)
- [x] Pipeline ready for visual regression (even if not active)
