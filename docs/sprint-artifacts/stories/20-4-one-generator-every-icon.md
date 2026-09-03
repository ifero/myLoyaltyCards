---
baseline_commit: 2de61e7016dfab9c1e91a4b5964714224f38daf2
retroactive: true
completed_in: '`ef4ff35`'
---

# Story 20.4: One generator, every icon — the brand-asset pipeline

Status: done

Epic: 20 — Cardì Identity & Design System

> **📌 WRITTEN RETROACTIVELY (2026-09-01).** This work was completed across August 2026 and is
> committed; the epic was only written up afterwards. The story is a **record**, not a brief —
> its acceptance criteria describe what was delivered and are checkable against the repo today.

## What was delivered

`scripts/build-brand-icons.mjs` — eight artefacts from one geometry definition, gated in pre-push
and CI.

```bash
yarn icons:build     # write them
yarn icons:check     # fail if any drifted
```

| artefact                                |                                             |
| --------------------------------------- | ------------------------------------------- |
| `assets/images/cardi-mark.svg`          | white stem + beam, for the ink launch field |
| `assets/images/cardi-icon.svg`          | the mark with its ink field                 |
| `assets/images/cardi-mark-adaptive.svg` | stem in `currentColor`, the in-app mark     |
| `assets/icon.png`                       | 1024, opaque, **no alpha**                  |
| `assets/adaptive-icon.png`              | 1024, transparent, ×0.873                   |
| `assets/adaptive-icon-monochrome.png`   | 1024, the Android 13 themed layer           |
| `assets/favicon.png`                    | 48, opaque                                  |
| `assets/splash-icon.png`                | 1024, transparent                           |

It supersedes `scripts/build-splash-icon.mjs`, which rasterised one asset from the pre-rebrand
artwork.

## Acceptance criteria

- [x] **Dependency-free.** The repo has no rasteriser at all — sharp, rsvg-convert, ImageMagick,
      Inkscape and pyobjc are all absent — so primitives are drawn with signed distance fields and
      the PNG is written by hand.
- [x] Rotation is applied to the **sample point** (an isometry, so the returned distance is
      already correct); scaling is applied to the **shape**, because scaling a rounded rect about
      a point yields another rounded rect exactly, and transforming the point would have left the
      distance in the scaled space and skewed the antialiasing.
- [x] The SVGs are **generated from the same constants** rather than hand-authored with a drift
      check, which removes the drift instead of detecting it.
- [x] The Android foreground scale is **derived** (`33 / bounding radius` = ×0.873) and clamped at
      1.0 so it can only shrink.
- [x] `assets/icon.png` is colour type **2 (RGB)** and the transparent assets are type 6 (RGBA).
- [x] `app.json`'s splash `backgroundColor` and `LAUNCH_FIELD_COLOR` are identical (`#181824`).
- [x] `IDENTITY_COLORS` (`ink`/`beam`/`cream`) added to `tokens/color.json` **additively**.
- [x] The two stock Material glyphs are replaced by the real mark.
- [x] `yarn icons:check` runs in `.husky/pre-push` and `ci-quality-gates.yml`.

## Two constraints the existing tests enforced

**iOS rejects an app icon carrying an alpha channel.** The first build wrote RGBA for everything
and `constants.test.ts` failed immediately. That guard exists because someone once "fixed" a
missing splash with `cp assets/icon.png assets/splash-icon.png`.

**The splash background and the launch field must be identical.** The native splash background is
baked at build time from `userInterfaceStyle` and cannot read a runtime theme; when the two
disagreed, device testing measured ~1.75 s of white followed by black content on every cold
start.

## Known gap

`currentColor` in the in-app mark is verified against react-native-svg 15.15.3's source (a
first-class brush, `type: 2`) but **not on a device**. The jest SVG mock means a green suite is
no evidence for it. Carried into story 21.6.
