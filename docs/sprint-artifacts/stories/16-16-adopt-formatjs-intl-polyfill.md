# Story 16.16: Adopt a Hermes-safe `Intl` polyfill (FormatJS) and enforce it via lint

Status: drafted

Epic: 16 — Platform & Tech Debt

## Story

As a developer adding internationalised formatting (relative time, numbers, dates, plurals),
I want `Intl` to be reliably available on every runtime the app ships to — including iOS Hermes —
so that using a standard `Intl.*` API can never again ship a green build that crashes fatally in production (the Story 16.15 class), and future i18n work has a safe, standard formatting foundation instead of hand-rolled per-locale strings.

## Context

Follow-up from **Story 16.15** (Sprint 17 retro, 2026-07-20, action item D). 16.15 was a fatal production crash: `formatRelativeTime` built `new Intl.RelativeTimeFormat` unconditionally, but **Hermes on iOS ships only a limited `Intl` subset that omits `RelativeTimeFormat`** → `new undefined(...)` → `TypeError`. Node/Jest has full ICU, so CI was green while the release build crashed on boot (Sentry REACT-NATIVE-1 handled, -2 fatal). See `docs/sprint-artifacts/stories/16-15-fix-relative-time-hermes-intl-crash.md` for the ICU parity table and root cause.

16.15 fixed the immediate crash by **dropping `Intl` entirely** and hardcoding EN/IT relative-time strings (`core/utils/relative-time.ts`, verified byte-for-byte vs ICU). That stopped the bleeding but left a strategic gap: the app is bilingual EN/IT and growing, and **any future use of a standard `Intl` API carries the same crash risk**. Hardcoding strings per locale does not scale, and the next `Intl` consumer (i18next's Intl-based `format` interpolation, number/currency/date formatting) would repeat 16.15.

At the retro, ifero decided to **invest in the FormatJS polyfill** as the go-forward foundation, rather than keep hand-rolling or keep a bare lint ban.

**Current runtime:** `expo ^55`, `react-native 0.83.6`, Hermes engine, New Arch. i18n via `i18next ^26` + `react-i18next ^17`, locale detection via `expo-localization`. `@formatjs/*` is **not** currently a dependency.

## Architecture Decision — AD-16-16-01: FormatJS polyfills with `/polyfill-force`, loaded in dependency order at the earliest entry; enforced by lint

**Decision.** Install the FormatJS polyfill chain and import it, in dependency order, at the app's earliest JS entry — **before any module that constructs an `Intl` object runs**:

```
@formatjs/intl-getcanonicallocales/polyfill-force
@formatjs/intl-locale/polyfill-force
@formatjs/intl-pluralrules/polyfill-force        + /locale-data/en + /locale-data/it
@formatjs/intl-relativetimeformat/polyfill-force + /locale-data/en + /locale-data/it
```

Place these in a dedicated module (recommend `shared/i18n/intl-polyfill.ts`) imported as the **first import** of the root entry (`app/_layout.tsx`, or earlier if a truer entry exists — see Open decisions), so load order is explicit and greppable.

**Why `/polyfill-force` (the critical footgun).** Hermes advertises a _partial_ `Intl`. The default auto-detecting FormatJS entry sees "`Intl.RelativeTimeFormat` is missing but `Intl` exists" and may **no-op or partially install**, leaving Hermes' broken subset in place — you'd ship "with the polyfill" and still crash. `/polyfill-force` unconditionally overwrites, guaranteeing a consistent implementation across Node, Android Hermes, and iOS Hermes. This must be verified on a real iOS Hermes build, not just Jest.

**Why dependency order matters.** `RelativeTimeFormat` depends on `PluralRules`, which depends on `Locale`/`getCanonicalLocales`. Importing out of order (or lazily, mid-boot) polyfills nothing useful.

**Locale data is per-locale weight.** Import only `en` + `it` data — never the full world dataset — to bound bundle growth. Record the measured size delta.

**Enforcement (supersedes the dropped interim ban).** Add a lint rule so the guarantee can't silently rot:

- **Forbid not-yet-polyfilled `Intl.*` APIs** (`Intl.ListFormat`, `Intl.DisplayNames`, `Intl.Segmenter`, `Intl.DurationFormat`, …) via `no-restricted-properties`, with a message pointing at this story: "not covered by the FormatJS polyfill set — add the polyfill + locale data here before using."
- **Guard the polyfill import** with a startup test asserting `Intl.RelativeTimeFormat`/`Intl.PluralRules` are defined, so deleting the entry import fails CI rather than silently re-opening the crash.

**Relative-time migration is OPTIONAL and NOT free (do not regress copy).** Migrating `core/utils/relative-time.ts` to `Intl.RelativeTimeFormat` would **change user-facing copy**: today it emits abbreviated English ("`5 min ago`") and custom edges ("`Just now`"/"`Never`"/"`Proprio adesso`"/"`Mai`"), none of which `Intl.RelativeTimeFormat` produces (it yields "`5 minutes ago`", and has no "just now"/"never"). So the migration is a **UX-copy decision**, not a refactor. Default: **leave 16.15's tested implementation as-is** and defer the migration to an explicit copy decision (Open decision #3). The polyfill infrastructure + lint guard stand on their own without it.

## Acceptance Criteria

1. The FormatJS polyfill chain (`intl-getcanonicallocales`, `intl-locale`, `intl-pluralrules`, `intl-relativetimeformat`) is installed and imported **in dependency order** via a single dedicated module loaded before any `Intl` consumer runs.
2. Every polyfill import uses the **`/polyfill-force`** variant (not the auto-detecting entry), and `en` + `it` locale data are registered for `intl-pluralrules` and `intl-relativetimeformat`.
3. On an **iOS Hermes** build, `new Intl.RelativeTimeFormat('it', { numeric: 'always' }).format(-5, 'minute')` returns the correct Italian string (verified on device/sim per the per-story validation habit — not only in Jest).
4. Only `en` + `it` locale data are bundled (no world dataset); the measured bundle-size delta is recorded in the Change Log / Completion Notes.
5. A lint rule (`no-restricted-properties` or equivalent) **fails** on any not-yet-polyfilled `Intl.*` API (e.g. `Intl.ListFormat`, `Intl.DisplayNames`, `Intl.Segmenter`) with a message pointing to this story. `yarn lint` fails on a deliberately-added offending line and passes once removed.
6. A startup/guard test asserts the polyfilled APIs (`Intl.RelativeTimeFormat`, `Intl.PluralRules`) are defined at runtime, so removing the polyfill entry import fails CI.
7. Existing behaviour is preserved: all current `relative-time` tests (EN + IT, 1-vs-N boundaries) stay green; no user-facing copy changes unless Open decision #3 explicitly approves the migration.
8. `yarn lint` / `typecheck` / `test` / `test:coverage` pass from the **main checkout** (not a `.claude` worktree); coverage maintained. A remaining-`Intl`-usage audit (grep) confirms no unguarded consumer is left outside the polyfill guarantee.

## Tasks / Subtasks

- [ ] (AC 1,2) Add deps: `@formatjs/intl-getcanonicallocales`, `@formatjs/intl-locale`, `@formatjs/intl-pluralrules`, `@formatjs/intl-relativetimeformat`. Create `shared/i18n/intl-polyfill.ts` importing them in dependency order with `/polyfill-force` + `en`/`it` locale data.
- [ ] (AC 1) Import `shared/i18n/intl-polyfill.ts` as the **first** import of the root entry (`app/_layout.tsx`); confirm whether an earlier true entry exists (Open decision #1) and place accordingly.
- [ ] (AC 3,4) Build an iOS Hermes dev/RC build; verify Italian `RelativeTimeFormat` output on device/sim; record the bundle-size delta (with vs without locale data).
- [ ] (AC 5) Add the `no-restricted-properties` lint rule for not-yet-polyfilled `Intl.*` APIs with a pointer message; prove it fails on an offending line and passes when removed.
- [ ] (AC 6) Add a guard test asserting `Intl.RelativeTimeFormat`/`Intl.PluralRules` are defined (fails if the polyfill entry import is removed).
- [ ] (AC 7,8) Run the remaining-`Intl`-usage audit (`grep -rn "Intl\\." app core shared features`); confirm every consumer is covered by the polyfill or the lint ban.
- [ ] (AC 7,8) Run `yarn lint`/`typecheck`/`test`/`test:coverage` from the main checkout.
- [ ] (Open decision #3, if approved) Migrate `core/utils/relative-time.ts` to `Intl.RelativeTimeFormat` — only with an explicit copy sign-off, updating the tests to the new strings; otherwise leave 16.15's implementation untouched.

## Dev Notes

### References

- `core/utils/relative-time.ts` — current hand-rolled EN/IT implementation (16.15 fix); the _optional_ migration target. Note the custom edges ("Just now"/"Never"/"Proprio adesso"/"Mai") and abbreviated EN ("min") that `Intl` does not reproduce.
- `docs/sprint-artifacts/stories/16-15-fix-relative-time-hermes-intl-crash.md` — root cause, the ICU parity table (`numeric: 'always'`), and the "do not reintroduce `Intl.*` without a Hermes-availability check" guardrail this story operationalises.
- `shared/i18n/index.ts` + `shared/i18n/locales/` — i18next setup and locale resolution (`getSystemLanguage`/`resolveLanguagePreference`); note i18next's own `format` interpolation can use `Intl` and would also benefit from the polyfill.
- `app/_layout.tsx` — root entry; earliest user-code hook for the polyfill import (485 lines; confirm no import-time `Intl` use precedes it).
- `package.json` — `expo ^55`, `react-native 0.83.6`, `i18next ^26`, `react-i18next ^17`, `expo-localization ~55`; `@formatjs/*` not yet present.
- FormatJS RN/Hermes guidance — **confirm the current polyfill entry paths, `/polyfill-force` availability, and locale-data import syntax against the installed package versions (Context7 / package README) before wiring.** Versions drift.
- Standing lesson (user memory): _verify Hermes support before using Node/stdlib APIs_ — Jest-on-Node green ≠ runtime-safe.

### Coverage note

`shared/i18n/**` is inside `collectCoverageFrom` as of Story 16.13 (`shared/**` widened into the gate), so the new `intl-polyfill.ts` module and any guard logic there **are measured** — budget real tests. `app/_layout.tsx` remains outside coverage (`app/**` not measured), so the entry-import wiring itself won't move the number.

### Test Plan

- **Guard test:** after importing the polyfill entry, assert `typeof Intl.RelativeTimeFormat === 'function'` and `typeof Intl.PluralRules === 'function'`; assert Italian output for a known input.
- **Lint test:** a fixture line using a banned `Intl.*` (e.g. `Intl.ListFormat`) fails `yarn lint`; removing it passes.
- **Regression:** existing `relative-time` EN/IT tests unchanged and green (unless #3 approved).
- **Device/Hermes:** manual iOS Hermes build smoke (AC3) — the only check that actually exercises the crash class; record the result on the story.

### Regressions to preserve

No user-facing copy change without explicit approval (#3); 16.15's crash fix stays effective; bundle growth bounded to `en`+`it`; no import-order regression (polyfill must remain first). Engine note: Android Hermes already has ICU, so this is primarily an iOS-Hermes safety net — do not assume an Android smoke covers AC3.

### Project Structure Notes

New dep + one new module (`shared/i18n/intl-polyfill.ts`) + one entry-import line + a lint-rule addition + tests. Part of the standing Epic 16 — Platform & Tech Debt bucket. NOT a Wear OS dependency (Android Hermes has ICU), so it can land in Sprint 18 or as a fast-follow independent of Epic 10.

### Definition of Ready

- [x] Root cause confirmed in code (file:line): iOS Hermes lacks `Intl.RelativeTimeFormat`; `relative-time.ts` currently avoids `Intl` entirely (16.15).
- [x] AD drafted (AD-16-16-01): `/polyfill-force` chain in dependency order at earliest entry; lint-enforced; migration optional with copy caveat.
- [x] Test strategy defined (guard test + lint fixture + device smoke; relative-time regression).
- [x] Scope tight (1 dep group + 1 module + 1 import + lint rule + tests; migration explicitly optional).
- [ ] Open decisions confirmed by ifero (below).

### Open decisions (recommended defaults applied)

1. **Earliest entry point** — baked in: first import of `app/_layout.tsx`. Confirm whether a truer pre-`_layout` entry exists (custom `index`/metro entry) that any import-time `Intl` use could precede.
2. **Polyfill breadth now** — baked in: `getcanonicallocales`+`locale`+`pluralrules`+`relativetimeformat` (what unblocks relative time and most i18next formatting). Defer `numberformat`/`datetimeformat` until a consumer needs them (add via the same pattern; keep them under the lint ban until then).
3. **Migrate `relative-time.ts`?** — baked in: **NO / defer.** Migrating changes EN copy ("min"→"minutes") and drops "Just now"/"Never" unless special-cased. Needs a UX-copy sign-off (Sally/ifero). Recommend keeping 16.15's tested strings and treating the polyfill as forward-only.
4. **Lint mechanism** — baked in: `no-restricted-properties` banning not-yet-polyfilled `Intl.*` APIs (+ guard test for the import). Alternative: a stricter `no-restricted-syntax` selector on `NewExpression` — only if a member-access ban proves too coarse.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log

| Date       | Change                                                                                                                                                                                                                    | Author       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 2026-07-20 | Drafted from Sprint 17 retro action D (AD-16-16-01): FormatJS `/polyfill-force` chain + lint enforcement; relative-time migration scoped optional with a UX-copy caveat. Awaiting ifero's open decisions → ready-for-dev. | Amelia (Dev) |
