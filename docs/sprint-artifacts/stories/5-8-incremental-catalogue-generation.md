# Story 5.8: Incremental catalogue generation

## Story Information

| Field        | Value                      |
| ------------ | -------------------------- |
| **Story ID** | 5-8                        |
| **Epic**     | 5 - Apple Watch App        |
| **Sprint**   | Next sprint                |
| **Status**   | Ready for dev              |
| **Priority** | Medium                     |
| **Estimate** | 3 points (1–2 days)        |
| **Owners**   | PM: Ifero · Dev: — · QA: — |

---

## Summary / Motivation

As a developer I want the watch catalogue code generator to run incrementally so that iterative Xcode builds are fast and developer feedback loops are not slowed by re-generating `watch-ios/Generated/Brands.swift` on every build. We must continue to keep the generated `Brands.swift` committed and ensure CI will fail if the committed generated file becomes stale.

---

## Acceptance Criteria

- AC1 — Skip regeneration when inputs unchanged
  - Given a clean repo and previously-generated `watch-ios/Generated/Brands.swift`, when I run a local watch build (`xcodebuild` or `yarn watch:build`), then the generator step does NOT re-run and build time is reduced.

- AC2 — Regenerate when an input changes
  - Given `catalogue/italy.json` (or the generator script) is modified/touched, when I run the watch build, then `watch-ios/Generated/Brands.swift` is regenerated and the change is visible in the generated file.

- AC3 — CI enforces generated-file correctness
  - Given a PR, CI runs a `check:catalogue-generated` job that runs the generator and compares output with the committed `watch-ios/Generated/Brands.swift`; CI fails if they differ.

- AC4 — Keep generated file committed
  - The project continues to commit `watch-ios/Generated/Brands.swift`; any automation that regenerates the file must update the committed artifact or fail CI.

---

## Implementation approach (high level)

1. Make the generator idempotent and able to detect unchanged inputs (store or compute a deterministic input-hash).
2. Add Xcode input/output file lists (`.xcfilelist`) for the generator build phase so Xcode can skip the script when inputs haven't changed.
3. Update `watch-ios/Scripts/generate-catalogue.swift` (or wrapper script) to:
   - compute a content hash of inputs (catalogue JSON + script files)
   - short-circuit (no-op) when the computed hash matches the previous run
   - still write `watch-ios/Generated/Brands.swift` when inputs changed
4. Add a Yarn developer command `yarn check:catalogue-generated` that runs the generator in check mode and exits non-zero if the generated output differs from the committed file.
5. Add unit tests and an integration test that assert: hash detection, regeneration on input change, and that `check:catalogue-generated` fails for stale commits.
6. Add CI job step that runs `yarn check:catalogue-generated` for PRs and main pipeline.
7. Update repository tooling (pre-commit hook / husky / lint-staged) to run the check locally when committing changes that touch `catalogue/` or generator scripts.

---

## CI & QA tasks

- Add `check:catalogue-generated` Yarn script and include in CI (PR and main pipeline).
- Add Jest/unit tests for generator logic; add a CI integration test to simulate ‘touch catalogue file → generator regenerates’.
- Add pipeline caching or make the check fast; measure impact on CI time and report.
- QA: manual verification steps (build with unchanged inputs; touch `catalogue/italy.json` → rebuild → confirm generated file changed).

---

## Short implementation plan / dev subtasks

1. Add `watch-ios/xcfilelists/generate-catalogue-inputs.xcfilelist` and `...-outputs.xcfilelist` mapping the JSON and output file respectively.
2. Update Watch target build phase to reference the new `.xcfilelist` files (inputs/outputs) — minimal Xcode project change.
3. Update `watch-ios/Scripts/generate-catalogue.swift` to compute an inputs-hash and short-circuit when unchanged (or add a tiny wrapper script to do the check).
4. Add `yarn check:catalogue-generated` that runs generator in "check" mode and compares `Generated/Brands.swift` against the committed version.
5. Add unit + integration tests covering hashing, regeneration, and the Yarn check command.
6. Add CI job/step to run `yarn check:catalogue-generated` on PRs.
7. Update pre-commit hook to run the check for commits touching `catalogue/` or `watch-ios/Scripts`.

---

## Rollback plan

- Revert the Xcode build-phase changes and generator modifications via a single revert PR.
- Temporarily disable the CI `check:catalogue-generated` step if it causes false-positives, then fix generator logic in a follow-up PR.
- Ensure generated file remained committed so a revert keeps repository in a working state.

---

## Estimate, priority & branch

- **Estimate:** 3 story points (1–2 days)
- **Priority:** Medium (high impact on developer productivity)
- **Suggested branch name:** `feature/5-8-incremental-catalogue-generation`

---

## PR checklist

- [ ] Implementation meets all acceptance criteria
- [ ] Unit and integration tests added and passing
- [ ] `yarn check:catalogue-generated` added and green in CI
- [ ] Pre-commit hook updated (or documented) to run the generator check
- [ ] Generated `watch-ios/Generated/Brands.swift` is committed and up-to-date
- [ ] Changes documented in story and changelog
- [ ] Stakeholder (Ifero) sign-off before merge

---

## Files likely to change

- `watch-ios/Scripts/generate-catalogue.swift` (or wrapper)
- `watch-ios/xcfilelists/*.xcfilelist`
- `watch-ios/MyLoyaltyCardsWatch.xcodeproj/project.pbxproj` (build phase inputs/outputs)
- `package.json` (new Yarn script)
- `__tests__` (generator unit + integration tests)
- CI config (add `check:catalogue-generated` step)

---

## Notes

- Keep the change minimal in native project files and prefer file-list based incremental skip (Xcode-friendly).
- Preserve the repo convention that the generated `Brands.swift` remains committed.
