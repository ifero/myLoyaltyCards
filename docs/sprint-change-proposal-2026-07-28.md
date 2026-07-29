# Sprint Change Proposal — Story 16.17 launch design reversal

**Date:** 2026-07-28
**Raised by:** Amelia (Dev) during `dev-story` execution of Story 16.17
**Approved by:** ifero (design direction approved 2026-07-28, before this proposal was written)
**Scope classification:** **Minor** — documentation/spec alignment only; the code change is already
implemented, tested and device-verified. No epic added, removed, resequenced or rescoped.

---

## 1. Issue summary

Story 16.17's design was ratified in a 2026-07-28 party-mode roundtable and implemented as written.
It then **failed twice on a real device**, and the second failure exposed a flaw in the story's
reasoning rather than in its implementation. Both failures trace to the same root cause: the story
optimised for properties that are cheap to assert (`byte-identical`, `matches the native layer`)
instead of the property that actually mattered (`the launch never changes brightness`).

### Failure 1 — the mark rendered as a hard-edged blue square

AD-16-17-02 chose `assets/splash-icon.png` = a byte copy of the shipped aurora icon raster, on the
reasoning that byte-identity guarantees continuity "by construction" and removes an unreproducible
rasterization step.

**Why that was wrong.** `assets/icon.png` is PNG colour-type 2 — **RGB with no alpha channel** — and
its corner pixels are solid `#1A73E8`. That is correct _for an app icon_: iOS and Android apply the
rounded-squircle mask **themselves** at the icon layer, so the source must paint into the corners. A
**splash** image receives no such treatment. Handed the raw icon, the launch field showed an unmasked
square that reads as a broken placeholder.

Worse, it silently broke the very guarantee AD-16-17-02 existed to provide: the JS surface renders
`app-icon-variant-aurora.svg`, whose root `<rect rx="230">` **does** round. Native (square) and JS
(rounded) never matched, so the handoff would have popped — on Android especially, where
`setOptions({ fade })` is a documented no-op.

### Failure 2 — the launch inverted luminance on every cold start

With the corners fixed, the launch was measured on the iOS simulator (iPhone 17 Pro, iOS 26.4) with
**system appearance = light** and the **app's persisted preference = dark** — i.e. a user who has
forced dark against their device. Field luminance sampled every 250 ms across 12 frames:

```
255, 255, 255, 255, 255, 255, 255 → 0
```

**~1.75 seconds of white, then black content.** A full-screen luminance inversion on every cold
start, which the designed 250 ms cross-fade does not rescue.

**Why this is not a tuning problem.** AD-16-17-05 correctly identified that the two layers resolve
their scheme from different sources, and chose to make the JS surface follow the **system** scheme so
it would agree with the native layer. That removes the _native↔JS_ mismatch but creates a
_launch↔app_ mismatch, and the latter is far more visible because it lasts the whole launch rather
than one frame. Critically, **no theme-aware field can avoid this**: the native splash background is
baked at build time from `userInterfaceStyle: "automatic"`, so it can never read a runtime
preference. Any theme-aware launch field must disagree with either the native layer or the app.
AD-16-17-05 accepted this explicitly — "one soft, designed transition instead of one hard, undesigned
cut" — and that judgement does not survive contact with the device.

### Evidence

| Claim                                        | Verification                                                                                                                                                                                                           |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `icon.png` is opaque, full-bleed             | IHDR colour-type `2`; corner pixel `(26,115,232)`                                                                                                                                                                      |
| Native mark was square, JS mark rounds       | Device screenshot + `<rect rx="230">` in the SVG                                                                                                                                                                       |
| Launch inverts luminance                     | 12-frame luminance sample, `255…→0`, ~1.75 s                                                                                                                                                                           |
| Native background cannot read the preference | `userInterfaceStyle: "automatic"` is build-time; colorset baked at prebuild                                                                                                                                            |
| Fix works                                    | 12-frame sample after fix: home → **brand blue ×7** → content, **no white frame**                                                                                                                                      |
| Fix survives a real prebuild                 | ifero's own clean prebuild: iOS colorset = single brand entry, **no dark appearance**; logos transparent at 260/520/780; Android drawable pre-composited on the same brand colour; `drawable-night-*` directories gone |

---

## 2. Impact analysis

### Epic impact — **none**

Epic 16 (Platform & Tech Debt) completes as planned. Story 16.17's user-facing goal is unchanged:
_"a single calm branded surface instead of a stack of flashing placeholder screens."_ Only the
mechanism changed, and the revision serves that goal strictly better. No epic is added, removed,
resequenced or rescoped. The SDK 57 upgrade thread (16.18–16.21) still starts after 16.17, and 16.16
still rides with it — unaffected.

### Story impact — Story 16.17 only

No other story is touched. Stories 16.10 / 16.12 / 16.14 keep every guarantee (`isReady`, both OTA
budgets, the `dbError` branch, `logger.notify` + `otaFailureKind`), and all nine `boot-loading`
assertions in `test/root-layout.offline-boot.test.tsx` still pass **unmodified**.

### Artifact conflicts

| Artifact                                   | Conflict                                                                                                                                         | Action         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| `docs/sprint-artifacts/stories/16-17-*.md` | AD-16-17-02, AD-16-17-03, AD-16-17-05, AC1–AC4, AC6, AC8, AC12, Open Decisions #2/#3/#5 all describe the abandoned design                        | **Amend** (§4) |
| `docs/epics.md` (Story 16.17 block)        | 4 of 9 ACs describe the abandoned design, incl. the byte-identity claim                                                                          | **Amend** (§4) |
| `docs/sprint-artifacts/sprint-status.yaml` | The `16-17` inline note documents AD-16-17-02/03/05 as shipped                                                                                   | **Amend** (§4) |
| `docs/prd.md`                              | No conflict — mentions only cold-start _performance_ (NFR-P2/P3) and NFR-U5's 500 ms indicator floor, which `BREATH_DELAY_MS = 600` still clears | None           |
| `docs/architecture.md`                     | No conflict — no splash/launch section; only cold-start performance targets                                                                      | None           |
| `docs/ux-design-specification.md`          | No conflict — zero splash/launch references (this story created that specification)                                                              | None           |
| `docs/project-context.md`                  | Already states native splash cannot be validated in Expo Go; consistent                                                                          | None           |

### Technical impact

Net **simplification**, not added complexity:

- `useColorScheme` deleted from the launch path — AD-16-17-05's entire mechanism is gone, not retuned.
- `app.json`'s plugin entry loses its `dark` variant, which removes Android's whole
  `drawable-night-*` resource path from the build output.
- Native and JS now agree by construction because there is exactly **one** colour, so AC4's Android
  pixel-identity requirement is satisfied without depending on two scheme resolvers matching.
- **New:** `scripts/build-splash-icon.mjs`, a dependency-free SDF rasteriser (~1 s) for the foreground
  SVG, gated by `yarn splash:check` in pre-push and CI beside `tokens:check`. This closes a gap the
  story itself named — _"there is no rasterization script in `scripts/`"_.
- **Regression guard added:** the launch field is asserted to be neither theme background, so the
  inversion cannot silently return.

---

## 3. Recommended approach

**Option 1 — Direct Adjustment.** Amend the story's ADs/ACs and the two dependent artifacts to
describe the shipped design. Effort **Low**, risk **Low**.

**Option 2 — Rollback** (revert to the ratified design): **not viable.** It restores a measured,
reproducible defect. Rejected.

**Option 3 — PRD/MVP review:** **not applicable.** No PRD requirement, NFR or MVP boundary is
affected; the launch surface has no PRD-level specification at all.

**Selected: Option 1.** The implementation is already complete, reviewed (code review and QA review
both reached zero comments on the pre-revision build), device-verified, and green across
`lint` / `typecheck` / `tokens:check` / `splash:check` / `test` (169 suites, 1825 tests) with
`shared/components/launch` at 100 % coverage. The only work outstanding is making the written record
match reality so the next reader does not re-derive the abandoned design from a document that still
recommends it.

**Timeline impact: none.** Story 16.17 remains in `review`.

---

## 4. Detailed change proposals

Applied in this commit. Summarised here; see the diff for exact text.

### 4.1 Story `16-17-redesign-app-launch-experience.md`

| Section            | Change                                                                                                                                                                                                                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AD-16-17-02**    | Retitled to the wallet **foreground** on a brand field. Byte-identity rationale replaced with the opaque/full-bleed explanation and why visual identity was the real goal. `SPLASH_LOGO_WIDTH` 200 → 260. "The field is the theme background, not the brand gradient" paragraph **reversed**, with the device evidence. |
| **AD-16-17-03**    | Retained for the `'#171717'` retirement and the Unistyles-is-engine-level reasoning (both still true and still load-bearing for the `dbError` branch). Amended to state the launch **field** is no longer theme-derived.                                                                                                |
| **AD-16-17-05**    | Marked **SUPERSEDED**, kept in place with its original analysis intact — it correctly identified the resolver split — plus why its chosen resolution was wrong and what replaced it. Not deleted: the analysis is the reason the fix is shaped the way it is.                                                           |
| **AC1**            | Byte copy → generated by `yarn splash:build` from the foreground SVG.                                                                                                                                                                                                                                                   |
| **AC2**            | `dark` variant → **no** `dark` variant; brand `backgroundColor`.                                                                                                                                                                                                                                                        |
| **AC3**            | "takes its background from the **system** scheme" → one scheme-independent brand field; adds the no-luminance-change requirement.                                                                                                                                                                                       |
| **AC4**            | Same-artwork/same-background wording generalised to same size **and same single field colour**.                                                                                                                                                                                                                         |
| **AC6**            | Mark is `app-icon-variant-aurora-transparent.svg` (foreground), not the boxed icon.                                                                                                                                                                                                                                     |
| **AC8**            | Byte-identity **replaced** with: alpha channel present, `icon.png` opaque, raster in sync with the SVG via `splash:check`.                                                                                                                                                                                              |
| **AC12**           | "both schemes" → brand field + absence-of-scheme-dependency.                                                                                                                                                                                                                                                            |
| **Open decisions** | #2 unchanged (mark-only still holds). #3 `200` → `260` with the reason. #5 aurora **foreground** variant.                                                                                                                                                                                                               |

### 4.2 `docs/epics.md` — Story 16.17 acceptance criteria

Four of nine bullets rewritten: the byte-identity bullet, the `dark`-variant bullet, the
theme-aware/system-scheme bullet, and the pixel-identity bullet.

### 4.3 `docs/sprint-artifacts/sprint-status.yaml`

The `16-17` inline note gains a `REVISED 2026-07-28` clause recording the reversal, so the tracker
does not describe a design that was never shipped.

---

## 5. Implementation handoff

**Scope: Minor → Developer agent (already executing).**

| Item                                                                        | Owner                    | Status                                                                  |
| --------------------------------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------- |
| Code, tests, rasteriser, CI gate                                            | Dev (Amelia)             | ✅ Done, all gates green                                                |
| Device verification of the revised design                                   | Dev + ifero              | ✅ Done (simulator, 12-frame sample)                                    |
| Amend story ADs/ACs, `epics.md`, `sprint-status.yaml`                       | Dev (Amelia)             | ✅ This proposal                                                        |
| **Re-run code review + QA review over the revised design**                  | Dev                      | ⛔ **Outstanding** — both loops passed against the _pre-revision_ build |
| **AC13: `prebuild --clean` + release build, both platforms, 4 screenshots** | ifero                    | ⛔ Outstanding (clean prebuild done; release build + screenshots not)   |
| Commit / push / PR                                                          | Dev, on ifero's approval | ⛔ Outstanding                                                          |

### Success criteria

1. No document under `docs/` recommends the abandoned theme-aware launch field.
2. The launch shows no luminance change from process start through the cross-fade, for a
   forced-preference user, on both platforms.
3. `yarn splash:check` fails if `assets/splash-icon.png` drifts from the SVG.
4. Stories 16.10 / 16.12 / 16.14 guarantees intact; all nine `boot-loading` assertions unmodified.

### Lessons worth carrying forward

- **A cheap-to-assert invariant is not automatically the right one.** "Byte-identical" was testable
  and satisfying, and it encoded the wrong requirement. Visual identity was never asserted, so
  nothing caught the square.
- **Launch surfaces cannot be signed off from CI or a mockup.** Two design failures survived a full
  green suite, a code review and a QA review — both at zero comments — because nothing in that chain
  looks at pixels. AC13 existed precisely for this and was the one AC deferred.
