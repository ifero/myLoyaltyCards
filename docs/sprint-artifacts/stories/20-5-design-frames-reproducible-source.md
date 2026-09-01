---
baseline_commit: 2de61e7016dfab9c1e91a4b5964714224f38daf2
retroactive: true
completed_in: '`b0880e9`, `6b59f20`, `1b0d11e`'
---

# Story 20.5: The design frames become reproducible source

Status: done

Epic: 20 — Cardì Identity & Design System

> **📌 WRITTEN RETROACTIVELY (2026-09-01).** This work was completed across August 2026 and is
> committed; the epic was only written up afterwards. The story is a **record**, not a brief —
> its acceptance criteria describe what was delivered and are checkable against the repo today.

## What was delivered

`docs/design/cardi/tools/` — the generators that build the specimen sheets, plus `verify.py`,
which reruns every one into a temporary directory and asserts byte-identical output.

```bash
python3 docs/design/cardi/tools/verify.py
```

## Acceptance criteria

- [x] Generators are named after what they build and resolve their output path from `__file__`,
      so they work in the main checkout and in any worktree.
- [x] `verify.py` redirects output at `pathlib.Path.write_text`, not by rewriting paths in the
      source; reads are left alone because some generators legitimately read a sibling frame to
      lift the shared token layer out of it.
- [x] `docs/design/cardi/frames/*.html` is in `.prettierignore`.
- [x] `tools/README.md` names the frames with **no** generator and why.

## Why the check exists

**A stale generator is worse than no generator.** An older lockup generator left in a scratch
directory still emitted acute accents, and when it ran it wrote `Cardí` back over a corrected
`Cardì`. Only the order the scripts happened to run in restored the file.

**The first version of this check could not fail.** It redirected output by string-replacing the
frames path inside each generator's source — which matched nothing, because the generators build
paths from concatenated literals and the full path never appears contiguously. The "sandboxed"
run wrote to the real directory and then compared the untouched copy against itself. Every
generator passed, **including two that cannot start at all**. Unanimous success across a
heterogeneous set is a reason to distrust the harness, not the code.

## Why Prettier is kept out

Prettier's HTML printer reflows attributes and inline elements, so a formatted frame could never
match its generator again and `verify.py` would fail permanently. Same arrangement the repo
already uses for the Room schemas and the prebuild-owned `AppIcon` `Contents.json`.

Note that the pre-existing `docs/design/cardi/*.html` entry does **not** cover the subdirectory:
a single `*` does not cross a directory separator.

## Not done

Nine of the fourteen frames have no generator: `barcode` and `card-detail` crash on a deleted
`shared_layer.txt` intermediate; `auth`, `onboarding` and `capture` predate the grave-accent
correction and would revert it; four never had one. They are hand-maintained HTML.
