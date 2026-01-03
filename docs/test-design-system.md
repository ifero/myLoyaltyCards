# System-Level Test Design

**Project:** myLoyaltyCards
**Date:** 2025-01-03
**Author:** Murat (TEA) | Requested by Ifero
**Status:** Draft
**Mode:** System-Level Testability Review (Phase 3)

---

## Executive Summary

This document provides a testability assessment of the myLoyaltyCards architecture before implementation begins. The project is a cross-platform mobile + wearable loyalty card app targeting 4 platforms (iOS, Android, watchOS, Wear OS) with offline-first architecture, cloud sync, and GDPR compliance.

**Risk Summary:**
- Total ASRs identified: 12
- High-priority risks (≥6): 3
- Critical categories: Performance (PERF), Data Integrity (DATA), Cross-Platform Consistency (TECH)

**Test Strategy:**
- Unit: 45% — Business logic, schemas, utilities
- Component: 25% — Feature screens in isolation
- Integration: 20% — Database, sync, API contracts
- E2E: 10% — Critical user journeys (main branch only)

---

## Testability Assessment

### Controllability: ✅ PASS

The architecture supports excellent test controllability:

| Aspect | Assessment | Evidence |
|--------|------------|----------|
| **State Control** | ✅ | expo-sqlite allows test database isolation; Zustand stores can be reset between tests |
| **External Dependencies** | ✅ | Supabase can be mocked; WatchConnectivity can be stubbed for unit tests |
| **Error Conditions** | ✅ | Network errors injectable via mock interceptors; offline mode testable via context.setOffline() |
| **API Seeding** | ✅ | Supabase REST API supports test data creation; factories can generate valid LoyaltyCard objects |

**Strengths:**
- Zod schemas enable factory-based test data generation
- Offline-first architecture means most tests don't require network
- Client-generated UUIDs prevent database dependency for IDs

**Recommendations for Sprint 0:**
- Create `test-utils/factories/` with Zod-based card factory
- Set up test database initialization helper
- Create mock WatchConnectivity wrapper

### Observability: ✅ PASS

The architecture provides sufficient observability for testing:

| Aspect | Assessment | Evidence |
|--------|------------|----------|
| **System State Inspection** | ✅ | SQLite queries expose local state; Zustand stores readable |
| **Deterministic Results** | ⚠️ CONCERNS | Sync conflict resolution (last-write-wins) may have race conditions if timestamps identical |
| **NFR Validation** | ✅ | Performance metrics measurable via Sentry; defined SLOs (<3s wearable, <1s cold start) |
| **Logging** | ✅ | Logger wrapper pattern defined; Sentry integration planned |

**Strengths:**
- Defined performance targets (NFR-P1 through NFR-P9)
- Error tracking via Sentry
- Sync status indicators for user feedback

**Recommendations for Sprint 0:**
- Add millisecond precision to timestamps for conflict resolution (already specified ✅)
- Implement test-mode logging that captures sync events
- Add performance markers for cold start measurement

### Reliability: ⚠️ CONCERNS

Some isolation concerns exist for cross-platform testing:

| Aspect | Assessment | Evidence |
|--------|------------|----------|
| **Test Isolation** | ⚠️ | 4 platforms with 3 native codebases (RN, Swift, Kotlin) complicate isolation |
| **Reproducibility** | ✅ | Deterministic waits possible; HAR capture for network mocking |
| **Parallel Safety** | ⚠️ | Shared Supabase test project needs RLS-based user isolation |
| **Component Coupling** | ✅ | Feature-first architecture with ESLint-enforced boundaries |

**Concerns:**
- Cross-platform schema drift risk between TypeScript, Swift, and Kotlin implementations
- Watch apps use build-time code generation (Brands.swift, Brands.kt) — generation bugs could cause silent failures
- Cloud sync throttling (5-minute cooldown) needs test mode bypass

**Recommendations for Sprint 0:**
- Implement cross-platform schema validation in CI (test-schemas.yml already defined ✅)
- Add test mode flag to bypass sync throttling
- Create isolated test users per CI run

---

## Architecturally Significant Requirements (ASRs)

### High-Priority ASRs (Score ≥6)

| ID | Requirement | Category | Probability | Impact | Score | Mitigation |
|----|-------------|----------|-------------|--------|-------|------------|
| ASR-001 | Wearable card display ≤3 seconds (NFR-P1) | PERF | 2 | 3 | **6** | Performance test suite; real device testing |
| ASR-002 | 100% offline functionality (NFR-R1) | DATA | 2 | 3 | **6** | Offline-first test mode; network interrupt simulation |
| ASR-003 | Cross-platform schema consistency | TECH | 3 | 2 | **6** | Shared test fixtures; CI schema validation |

### Medium-Priority ASRs (Score 3-4)

| ID | Requirement | Category | Probability | Impact | Score | Mitigation |
|----|-------------|----------|-------------|--------|-------|------------|
| ASR-004 | Zero data loss during sync (NFR-R8) | DATA | 1 | 3 | 3 | Transaction-based writes; conflict resolution tests |
| ASR-005 | Phone cold start <1 second (NFR-P2) | PERF | 2 | 2 | 4 | Startup profiling; lazy loading |
| ASR-006 | Watch cold start <2 seconds (NFR-P3) | PERF | 2 | 2 | 4 | Native performance optimization |
| ASR-007 | Barcode rendering <100ms (NFR-P4) | PERF | 1 | 2 | 2 | Barcode library benchmarks |
| ASR-008 | GDPR data deletion within 30 days (NFR-S8) | BUS | 1 | 3 | 3 | API test for deletion flow |
| ASR-009 | Phone-watch sync within 30 seconds (NFR-P5) | PERF | 2 | 2 | 4 | WatchConnectivity integration tests |
| ASR-010 | AES-256 encryption at rest (NFR-S1) | SEC | 1 | 3 | 3 | Supabase default; verify in audit |

### Low-Priority ASRs (Score 1-2)

| ID | Requirement | Category | Probability | Impact | Score | Action |
|----|-------------|----------|-------------|--------|-------|--------|
| ASR-011 | 60fps UI interactions (NFR-P6) | PERF | 1 | 1 | 1 | Monitor with profiler |
| ASR-012 | bcrypt password hashing (NFR-S3) | SEC | 1 | 1 | 1 | Supabase default; verify |

---

## Test Levels Strategy

### Recommended Split: 45/25/20/10

Based on the architecture (offline-first mobile + wearable, API-heavy, multi-platform) and Cross-Functional War Room analysis:

| Level | Percentage | Rationale |
|-------|------------|-----------|
| **Unit** | 45% | Zod schemas, sorting algorithms, data transformations, sync logic |
| **Component** | 25% | Feature screens in isolation (React Native Testing Library) |
| **Integration** | 20% | Database operations, Supabase API, sync protocol contracts |
| **E2E** | 10% | Critical user journeys only — runs on main branch, not PRs |

### Test Level Mapping

| Test Area | Level | Framework | Notes |
|-----------|-------|-----------|-------|
| Zod schema validation | Unit | Jest/Vitest | `parseWithLogging` function |
| Smart sorting algorithm | Unit | Jest/Vitest | FR21-24 sorting rules |
| Card factory generation | Unit | Jest/Vitest | All barcode formats |
| Sync message protocol | Unit | Jest | Version compatibility tests |
| CardList screen | Component | RNTL | Isolated with mock data |
| AddCard flow UI | Component | RNTL | Form validation, scanner stub |
| BarcodeFlash overlay | Component | RNTL + Snapshot | Visual regression |
| Database CRUD | Integration | Jest + expo-sqlite mock | Transaction testing |
| Supabase API calls | Integration | Jest + MSW | Mock Supabase REST |
| Sync conflict resolution | Integration | Jest | Last-write-wins scenarios |
| Sync protocol contracts | Integration | Jest + Zod | Phone ↔ Watch message validation |
| Add card flow | E2E | Maestro (mobile) | Camera scan + manual entry |
| Barcode Flash display | E2E | Maestro (mobile) | Performance timing |
| Watch card list | E2E | XCTest (watchOS) | Native UI testing |
| Cloud sync roundtrip | E2E | Jest + Supabase | Multi-device scenarios |

### Platform-Specific Testing

| Platform | Framework | Notes |
|----------|-----------|-------|
| React Native (iOS/Android) | Jest + RNTL + Maestro | Unit + Component + E2E |
| watchOS (Swift) | XCTest + XCUITest | Native testing |
| Wear OS (Kotlin) | JUnit + Compose Testing | Phase 2 |
| Cross-Platform Schemas | CI workflow | test-schemas.yml |

### Visual Regression Testing

**Purpose:** Ensure barcode scannability and UI consistency across updates.

| Target | Tool | Trigger |
|--------|------|---------|
| Barcode Flash overlay | Jest Snapshot | All PRs |
| Virtual Logo rendering | Jest Snapshot | All PRs |
| Theme consistency (light/dark) | Jest Snapshot | All PRs |

**Critical:** The Barcode Flash overlay MUST maintain pure white (`#FFFFFF`) background for scanner compatibility. Any color drift could cause checkout failures.

### Contract Testing

**Purpose:** Validate sync protocol compatibility between phone and watch.

| Contract | Test Type | Coverage |
|----------|-----------|----------|
| Sync message schema | Unit | CARDS_UPDATED, CARD_ADDED, CARD_DELETED, REQUEST_FULL_SYNC |
| Version compatibility | Unit | v1 phone → v1 watch, v2 phone → v1 watch (graceful fallback) |
| Supabase REST responses | Integration | Card CRUD operations, auth flows |

**Implementation:** Use Zod schemas as contract definitions. Both TypeScript (phone) and Swift/Kotlin (watch) must parse the same test fixtures successfully.

### CI Cost Strategy

**Rationale:** macOS runners cost $0.08/minute. E2E on every PR is expensive and slow.

| Test Suite | Trigger | Runner | Time Budget |
|------------|---------|--------|-------------|
| Unit + Component | All PRs | ubuntu-latest | <5 min |
| Integration | All PRs | ubuntu-latest | <5 min |
| Schema Validation | All PRs | ubuntu-latest | <2 min |
| Visual Snapshots | All PRs | ubuntu-latest | <3 min |
| **E2E (Full)** | **main branch only** | macos-14 | <30 min |
| E2E + Performance | Releases | macos-14 | <45 min |

**Cost Estimate:** ~$2.40-3.60/day for main branch E2E runs (assuming 1-2 merges/day).

---

## NFR Testing Approach

### Security (NFR-S1 to NFR-S12)

| NFR | Testing Approach | Tools | Priority |
|-----|-----------------|-------|----------|
| NFR-S1: AES-256 encryption | Verify Supabase configuration | Manual audit + API test | P1 |
| NFR-S2: TLS 1.2+ | Network capture validation | Wireshark (manual) | P2 |
| NFR-S3: bcrypt passwords | Supabase default | Verify in Supabase docs | P2 |
| NFR-S5: GDPR compliance | Data export/deletion tests | E2E tests | P0 |
| NFR-S6: No tracking | Code review | Static analysis | P1 |
| NFR-S10: Guest mode isolation | E2E test | Maestro | P0 |
| NFR-S11: RLS data protection | API tests | Jest + Supabase | P0 |

**GDPR Test Scenarios (P0):**
1. Data export returns all user cards in JSON format
2. Account deletion removes cloud data (verify via API query)
3. Guest mode data stays local only (no Supabase calls)

### Performance (NFR-P1 to NFR-P9)

| NFR | Testing Approach | Tools | Target | Priority |
|-----|-----------------|-------|--------|----------|
| NFR-P1: Wearable ≤3s | Real device timing | XCTest + performance markers | ≤3000ms | P0 |
| NFR-P2: Phone cold start <1s | Expo profiling | React DevTools Performance | ≤1000ms | P0 |
| NFR-P3: Watch cold start <2s | Xcode Instruments | Time to first frame | ≤2000ms | P0 |
| NFR-P4: Barcode render <100ms | Unit benchmark | Jest performance.now() | ≤100ms | P1 |
| NFR-P5: Sync <30s | Integration timing | Jest timeout | ≤30000ms | P1 |
| NFR-P6: 60fps UI | Manual profiling | React DevTools | No frame drops | P2 |

**Performance Testing Strategy:**
- Use React Native performance markers for cold start
- watchOS: Xcode Instruments with Time Profiler
- Barcode libraries: Benchmark in isolation before integration
- CI gate: Fail if P0 performance targets not met

### Reliability (NFR-R1 to NFR-R10)

| NFR | Testing Approach | Tools | Priority |
|-----|-----------------|-------|----------|
| NFR-R1: 100% offline | Offline simulation | context.setOffline() | P0 |
| NFR-R2: Zero data loss | Transaction tests | jest + expo-sqlite | P0 |
| NFR-R3: Watch independence | Disconnect simulation | XCTest | P0 |
| NFR-R4: Conflict resolution | Last-write-wins scenarios | Integration tests | P1 |
| NFR-R6: Sync retry | Network interrupt tests | jest mock | P1 |
| NFR-R8: App update data persistence | Manual testing | QA checklist | P1 |

**Offline Testing Strategy:**
1. Unit tests: All business logic works without network calls
2. Integration tests: Database operations succeed offline
3. E2E tests: Full user journey in airplane mode (Maestro + context.setOffline)

### Maintainability (NFR-M1 to NFR-M8)

| NFR | Testing Approach | Tools | Priority |
|-----|-----------------|-------|----------|
| NFR-M1: React Native best practices | ESLint + Prettier | CI linting | P1 |
| NFR-M3: Project structure | ESLint no-restricted-imports | CI | P0 |
| NFR-M7: Critical flow tests | Coverage reporting | Jest coverage | P0 |
| NFR-M8: Device testing | Real device CI | GitHub Actions macOS runners | P1 |

**CI Quality Gates:**
- ESLint must pass (feature boundary enforcement)
- TypeScript strict mode compilation
- Test coverage ≥70% for core/ layer
- Cross-platform schema tests pass

---

## Test Environment Requirements

### Local Development

| Environment | Purpose | Configuration |
|-------------|---------|---------------|
| In-memory SQLite | Unit tests | Reset per test |
| Mock Supabase | Integration | MSW service worker |
| iOS Simulator | E2E phone | Xcode + Maestro |
| watchOS Simulator | E2E watch | Xcode XCUITest |
| Android Emulator | E2E phone (Phase 2) | Android Studio |

### CI/CD

| Environment | Runner | Purpose |
|-------------|--------|---------|
| `ubuntu-latest` | GitHub Actions | Unit + Integration tests |
| `macos-14` | GitHub Actions | iOS/watchOS builds + E2E |
| Supabase Dev | Cloud | Integration with real DB |

**Environment Strategy:**
- Unit tests: No external dependencies (fast, any runner)
- Integration tests: Mock external services (MSW for Supabase)
- E2E tests: macOS runners for iOS/watchOS (real simulators)

---

## Testability Concerns

### Concern 1: Cross-Platform Schema Drift

**Risk:** TypeScript, Swift, and Kotlin implementations of card schema may diverge, causing sync failures.

**Severity:** ⚠️ MEDIUM → Mitigated

**Mitigation:**
1. Shared test fixtures at `/test-fixtures/` (already defined ✅)
2. CI workflow `test-schemas.yml` validates parsing on all platforms
3. Build-time catalogue generation ensures consistency
4. Zod schema is source of truth; Swift/Kotlin must match exactly
5. **NEW:** Contract tests validate sync protocol messages

**Recommendation:** Add schema round-trip test in CI that:
- Generates card JSON from TypeScript
- Parses in Swift, serializes back
- Parses in Kotlin, serializes back
- Compares output matches original

### Concern 2: Sync Protocol Version Compatibility

**Risk:** Phone sends v2 sync message, watch only supports v1 → silent data loss or crash.

**Severity:** ⚠️ MEDIUM → Mitigated

**Mitigation:**
1. Contract tests validate all message types (CARDS_UPDATED, CARD_ADDED, etc.)
2. Test fixtures include version mismatch scenarios
3. Explicit test for graceful fallback behavior (v2 phone → v1 watch → REQUEST_FULL_SYNC)
4. Sync message factory generates all protocol versions

**Recommendation:** Add to `/test-fixtures/sync-version-mismatch.json` with test case for unknown version handling.

### Concern 3: Wearable Testing Infrastructure

**Risk:** watchOS and Wear OS apps require native testing infrastructure that's harder to automate.

**Severity:** ⚠️ MEDIUM

**Mitigation:**
1. watchOS: XCTest + XCUITest with Xcode Cloud or self-hosted macOS runners
2. Phase 1 focuses on watchOS only (simpler initial setup)
3. Wear OS testing deferred to Phase 2

**Recommendation for Sprint 0:**
- Set up GitHub Actions macOS runner for watchOS builds
- Create basic XCTest suite for WatchConnectivity message parsing
- Manual QA checklist for wearable-specific behaviors

### Concern 4: Sync Throttling in Tests

**Risk:** 5-minute cloud sync throttling prevents rapid integration testing.

**Severity:** ⚠️ LOW

**Mitigation:**
1. Add `TEST_MODE` flag that bypasses throttle
2. Unit tests mock the sync layer entirely
3. Integration tests use forceSyncWithCloud() which bypasses throttle (already defined ✅)

**Recommendation:** Environment variable `BYPASS_SYNC_THROTTLE=true` for CI.

---

## Recommendations for Sprint 0

### Test Framework Setup

| Task | Priority | Description |
|------|----------|-------------|
| Jest configuration | P0 | Configure with TypeScript, React Native preset |
| React Native Testing Library | P0 | Component testing for feature screens |
| Test utilities | P0 | Create `test-utils/` with factories, mocks |
| Card factory | P0 | Zod-based factory for all barcode formats |
| Sync message factory | P0 | Factory for versioned sync protocol messages |
| Database test helper | P0 | Reset and seed expo-sqlite between tests |
| Snapshot testing setup | P0 | Configure for visual regression (Barcode Flash) |
| MSW setup | P1 | Mock Supabase REST API for integration tests |
| Maestro setup | P1 | E2E framework for React Native |
| Contract test setup | P1 | Zod-based schema validation for sync protocol |
| CI workflow skeleton | P1 | GitHub Actions with tiered test runs |

### CI/CD Quality Gates

| Gate | Trigger | Criteria |
|------|---------|----------|
| Lint | All PRs | ESLint + TypeScript pass |
| Unit Tests | All PRs | 100% pass, ≥70% coverage for core/ |
| Component Tests | All PRs | 100% pass, feature screens render |
| Schema Tests | All PRs | Cross-platform validation passes |
| Visual Snapshots | All PRs | No unexpected changes to Barcode Flash |
| Integration Tests | All PRs | 100% pass, contracts validated |
| **E2E Tests** | **Main branch only** | Critical user journeys pass |
| Performance | Release builds | Cold start targets met |

### Test Directory Structure

```
/test-fixtures/                  # Cross-platform test data
├── card-valid.json              # Standard card, all platforms parse
├── card-all-formats.json        # All barcode formats
├── card-nullable-fields.json    # Tests null handling
├── sync-message-v1.json         # Sync protocol v1 example
├── sync-message-v2.json         # Sync protocol v2 example (future)
└── sync-version-mismatch.json   # Version fallback test case

/test-utils/                     # Shared test utilities
├── factories/
│   ├── cardFactory.ts           # Zod-based card generation
│   ├── userFactory.ts           # Test user generation
│   └── syncMessageFactory.ts    # Versioned sync message generation
├── mocks/
│   ├── supabaseMock.ts          # MSW handlers for Supabase
│   └── watchConnectivityMock.ts # Mock WatchConnectivity
├── contracts/
│   ├── syncProtocol.test.ts     # Sync message contract tests
│   └── supabaseApi.test.ts      # Supabase REST contract tests
└── helpers/
    ├── databaseHelper.ts        # SQLite reset/seed
    ├── renderWithProviders.tsx  # RNTL wrapper with Zustand/Query
    └── testSetup.ts             # Global test configuration

/features/*/                     # Co-located component tests
├── __tests__/
│   ├── ComponentName.test.tsx   # Component tests (RNTL)
│   └── __snapshots__/           # Visual regression snapshots
```

---

## Quality Gate Criteria

### Pre-Implementation Gate

Before beginning Epic 1 implementation:

- [ ] Jest + TypeScript configured
- [ ] React Native Testing Library configured
- [ ] Card factory implemented
- [ ] Sync message factory implemented
- [ ] Database test helper ready
- [ ] Snapshot testing configured for visual regression
- [ ] ESLint rules verified (feature boundaries)
- [ ] CI workflow skeleton created (tiered: PR vs main)
- [ ] Test fixtures created at /test-fixtures/
- [ ] Contract test structure in place

### Sprint Gate (Per Epic)

For each epic completion:

- [ ] All P0 tests pass (100%)
- [ ] P1 tests pass rate ≥95%
- [ ] No high-risk (≥6) items unmitigated
- [ ] Coverage ≥70% for new code in core/
- [ ] Cross-platform schema tests pass
- [ ] Visual snapshots approved (no unexpected changes)
- [ ] Contract tests pass

### Release Gate

Before App Store submission:

- [ ] All E2E tests pass on real devices
- [ ] Performance targets met (NFR-P1 through P6)
- [ ] Security checklist complete (NFR-S1 through S12)
- [ ] GDPR compliance verified (data export, deletion)
- [ ] Manual QA checklist signed off

---

## Output Summary

### Test Design Complete

**Mode:** System-Level (Phase 3 - Testability Review)
**Scope:** Full architecture testability assessment

**Risk Assessment:**
- Total ASRs identified: 12
- High-priority (≥6): 3 (Performance, Offline, Cross-Platform)
- Medium-priority (3-4): 7
- Low-priority (1-2): 2

**Testability Assessment:**
- Controllability: ✅ PASS
- Observability: ✅ PASS
- Reliability: ⚠️ CONCERNS (cross-platform testing complexity)

**Test Levels Strategy (Revised via Cross-Functional War Room):**
- Unit: 45% — Schemas, algorithms, utilities, sync protocol
- Component: 25% — Feature screens in isolation (RNTL)
- Integration: 20% — Database, API, contracts
- E2E: 10% — Critical journeys (main branch only)

**Key Enhancements from War Room:**
1. Added Component testing layer (25%) for feature screens
2. Added Visual Regression testing for Barcode Flash overlay
3. Added Contract Testing for sync protocol versioning
4. CI Cost Strategy: E2E runs on main only (not PRs)

**Testability Concerns Flagged:**
1. Cross-platform schema drift (MEDIUM) → Mitigated by contract tests
2. Sync protocol version compatibility (MEDIUM) → Mitigated by contract tests
3. Wearable testing infrastructure (MEDIUM)
4. Sync throttling in tests (LOW)

**Sprint 0 Priorities:**
1. Jest + TypeScript + React Native Testing Library
2. Card factory + Sync message factory
3. Database test helper
4. Snapshot testing for visual regression
5. CI workflow with tiered runs (PR vs main)
6. Contract test structure
7. Test fixtures creation

**Output File:** `docs/test-design-system.md`

**Next Steps:**
1. Review testability concerns with team
2. Prioritize Sprint 0 test infrastructure setup
3. Run `*framework` workflow to scaffold test framework
4. After implementation readiness gate, run `*test-design` again for epic-level planning

---

**Generated by:** BMad TEA Agent - Test Architect Module
**Workflow:** `.bmad/bmm/testarch/test-design`
**Version:** 4.0 (BMad v6)

