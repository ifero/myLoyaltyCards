# Frame generators

The specimen sheets in [`../frames/`](../frames/) are **built**, not hand-written. Each script here emits exactly one of them, and the committed HTML is that script's output byte for byte.

```bash
python3 docs/design/cardi/tools/mark_locked.py   # rebuild one sheet
yarn frames:check                                # check every sheet still matches
```

`frames:check` runs in pre-push and CI, alongside `tokens:check` and `icons:check` — an
ungated guard is a comment.

No dependencies beyond the Python standard library.

## Why the check exists

`verify.py` runs every generator against a temporary directory and diffs the result against the committed frame. It does not write into `../frames/` — and rather than trusting that, it digests the whole directory before and after the run and fails if anything moved. Enumerating write APIs is a losing game: the first version patched only `write_text`, so a generator using `open()` would have escaped it into the real directory during a "read-only" check.

A stale generator is worse than no generator: it looks authoritative, and the moment someone runs it, it silently reverts whatever was fixed by hand in the HTML. That is not hypothetical. An older lockup generator was left behind in a scratch directory still emitting **acute** accents, and when it ran it wrote `Cardí` back over a corrected `Cardì`. Only the order the scripts happened to run in saved that file. `verify.py` is the guard that turns that class of accident into a failing check.

If it reports `STALE`, either the generator drifted or someone hand-edited the HTML. Decide which is the source of truth and fix **that** one. Do not simply regenerate — that is how hand fixes get lost.

## Prettier

`../frames/*.html` is listed in `.prettierignore`. It has to be: Prettier's HTML printer reflows attributes and inline elements, so a formatted frame could never again match its generator's output and `verify.py` would fail permanently. The generators are the source of truth here, the same arrangement the repo already uses for the Room schemas and the prebuild-owned `AppIcon` `Contents.json`.

Note that the entry above it, `docs/design/cardi/*.html`, does **not** cover this folder — a single `*` does not cross a directory separator.

## What is here

| script               | builds                       |
| -------------------- | ---------------------------- |
| `icon_decision.py`   | `cardi-icon-decision.html`   |
| `icon_explore.py`    | `cardi-icon-explore.html`    |
| `mark_locked.py`     | `cardi-mark-locked.html`     |
| `mark_sweep35.py`    | `cardi-mark-sweep35.html`    |
| `mark_candidates.py` | `cardi-mark-candidates.html` |
| `brand_lockup.py`    | `cardi-brand-lockup.html`    |
| `grave_vs_acute.py`  | `cardi-grave-vs-acute.html`  |

`icon_decision.py` is the live one: the wordmark is settled, the square is not. It computes each variant's bounding radius and derives the Android foreground scale from it (`33 / radius`) rather than hardcoding a number, so changing the artwork updates the export scale on its own.

## What is deliberately NOT here

Nine of the sixteen frames have **no generator in this folder** — auth, barcode, capture, card-detail, document, form, onboarding, settings and wallet. That is a statement of fact rather than an oversight, and the reasons differ:

- **`cardi-barcode-frames.html`, `cardi-card-detail-frames.html`** — their generators cannot run at all. Both read an intermediate `shared_layer.txt` that no longer exists.
- **`cardi-auth-frames.html`, `cardi-onboarding-frames.html`** — their generators predate the grave-accent correction and would rewrite the CSS lockup back to an acute. Beyond that the delta is only Prettier's attribute formatting.
- **`cardi-capture-frames.html`** — same situation, formatting only.
- **`cardi-document-frames.html`, `cardi-form-frames.html`, `cardi-settings-frames.html`, `cardi-wallet-frames.html`** — never generated.

Rehabilitating the first five is real work and none of it was done, so nothing was moved that could not be proven. Treat all nine as hand-maintained HTML for now.

## The geometry every script shares

All of it is em space, 100 units to the em:

| constant   | value  | meaning                                            |
| ---------- | ------ | -------------------------------------------------- |
| `BASELINE` | `70.0` | the glyph's baseline inside its 1em box            |
| `XHEIGHT`  | `49.6` | measured from Space Grotesk, matching its own `x`  |
| `STEM_TOP` | `20.4` | `BASELINE - XHEIGHT`                               |
| `ADV`      | `30`   | the ì's advance width (the font's own `i` is 26.6) |
| `ANGLE`    | `35`   | positive, so the accent descends — see below       |

Two rules cost more to learn than anything else in these files, and both are written up properly in [`../cardi-design-system.md`](../cardi-design-system.md):

1. **The accent descends.** SVG and CSS both point the y-axis down, so `rotate(35)` is the grave and `rotate(-35)` is an acute — a different word. Mirroring a _sheared_ stroke also needs the outline mirrored, not just the sign flipped, or the beam silently changes length.
2. **The ì's baseline anchoring ships inline on the `<svg>`**, never as a stylesheet rule. Left to a stylesheet it gets dropped when a new sheet is written, and the glyph floats exactly `(100 − BASELINE) / 100 = 0.30em` above the word. That has happened twice.
