<!--
  Thanks for contributing to myLoyaltyCards! 🎉
  This project is spec-first (BMAD SDD): every code change traces back to a story.
  Please read CONTRIBUTING.md before opening this PR.

  Title format:  <type>(<scope>): <summary> (Story X.Y)
  Example:       feat(watch): render barcode complication (Story 5.9)
-->

## Summary

<!-- What does this PR do, and why? 1–3 sentences. -->

## Related story / issue

<!-- Code PRs must reference a `ready-for-dev` story. Catalogue-only PRs may reference an issue instead. `design`-label fast-path PRs (token/visual polish) need neither — see the `design` checkbox under "Type of change" below. -->

- Story: `docs/sprint-artifacts/stories/<id>.md`
- Closes #

## Type of change

- [ ] ✨ `feat` — new feature
- [ ] 🐛 `fix` — bug fix
- [ ] ♻️ `refactor` — no behavior change
- [ ] 📝 `docs` — documentation / specs
- [ ] ✅ `test` — tests only
- [ ] 🔧 `chore` — tooling / maintenance
- [ ] 🏷️ `catalogue` — brand catalogue entry
- [ ] 🎨 `design` — UX/UI change (apply the **`design`** label; token/visual polish is story-exempt — see [`docs/design/CONTRIBUTING-DESIGN.md`](docs/design/CONTRIBUTING-DESIGN.md). There is no `design:` commit type — use `docs`/`fix`/`refactor`.)

## Acceptance criteria

<!-- Copy the story's acceptance criteria and tick the ones this PR satisfies. -->

- [ ] AC1 —
- [ ] AC2 —

## Screenshots / screen recordings

<!--
  REQUIRED for any user-visible change. Drag & drop images or videos below.
  Include the Apple Watch as well as the phone where relevant, and both light & dark mode.
  If this is not a UI change, tick the box and delete the table.

  🎨 Design PRs: for components covered by Storybook (story 16-5) you MAY replace the
  before/after table with a Storybook/Chromatic build link (paste it in place of the table).
  CARVE-OUT: the native (Swift) Apple Watch UI and ANY screen not covered by Storybook
  STILL REQUIRE screenshots (Storybook renders the RN component tree, not the watch's
  native UI). See docs/design/CONTRIBUTING-DESIGN.md.
-->

| Before | After |
| ------ | ----- |
|        |       |

- [ ] Not a user-visible change (no screenshots needed)

## How was this tested?

<!-- Manual steps, devices/simulators used, and automated test summary. -->

- Test results:
- Coverage (if relevant):

## Author checklist

- [ ] A `ready-for-dev` story exists and its acceptance criteria are met _(skip for `design` fast-path or `catalogue` PRs)_
- [ ] `yarn lint`, `yarn typecheck`, and `yarn test` pass locally (I did **not** use `--no-verify`)
- [ ] New behavior has co-located tests; coverage is not regressed
- [ ] Follows the layer boundaries & rules in `docs/project-context.md` and `AGENTS.md`
- [ ] `docs/sprint-artifacts/sprint-status.yaml` and the story file are updated _(skip for `design` fast-path or `catalogue` PRs)_
- [ ] I performed a self-review of my own changes

---

> 🔍 A maintainer reviews and merges — **please don't merge your own PR.** After merge, the story moves to `done`.
