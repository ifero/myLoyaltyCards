# Sprint Artifacts

This folder holds the project's BMAD sprint-tracking artifacts. It is **BMAD 6.12-compliant**, with
a small set of **documented extensions** that the BMAD readers tolerate. This README is the reference
for those extensions and for the story lifecycle — it is loaded as a persistent fact by the
customized `bmad-build` and `bmad-sprint-planning` skills.

## Layout

| Path                                                             | What it is                                                                                                                                                             |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sprint-status.yaml`                                             | **Authoritative** system of record — live status + sprint blocks (see below).                                                                                          |
| `stories/`                                                       | One markdown file per story, `{epic}-{story}-{slug}.md`. **Story files live here, not flat.**                                                                          |
| `test-reviews/` (+ `test-design/`, `traceability/` on first use) | TEA (Test Architect) output locations, pinned in `_bmad/custom/config.toml`. Only `test-reviews/` exists today; the others are created when their workflow first runs. |
| `*-retro-*.md`                                                   | Epic / sprint retrospectives.                                                                                                                                          |
| `sprint-change-proposal-*.md`, `manual-*.md`, `epic-*-cicd.yaml` | Point-in-time working docs.                                                                                                                                            |

`docs/epics.md` is the human-readable **story catalogue** (every `### Story N.M` there maps 1:1 to a
`development_status` key here). The **tracker is source of truth** for live status; `epics.md` is
regenerated _from_ the tracker, never the reverse.

That 1:1 mapping is **enforced in CI** by `yarn check:story-catalogue-sync`
([`scripts/check-story-catalogue-sync.mjs`](../../scripts/check-story-catalogue-sync.mjs)), which
reports gaps in both directions and also pins `epics.md`'s `totalStories` frontmatter to the literal
`### Story ` heading count. It exists because the invariant broke twice in a row — a drafting PR added
the tracker key and the story file but not the catalogue section, leaving the story skill reading a key
with no content behind it.

A heading whose id does **not** derive from its tracker key — today `### Story 12.IC:` and
`### Story 12.FI:`, whose keys are `12-icon-doc-cleanup` and `12-figma-icon-update` — declares the
mapping in its own section body on a `Tracker key:` line (see either section for the exact form). Add
that line for any future oddity rather than special-casing the script.

## Why story files live in `stories/`

The story-status automation hardcodes this path — `scripts/lib/story-refs.mjs`,
`scripts/mark-story-done.mjs`, `scripts/check-pr-conventions.mjs`, and
`.github/workflows/mark-story-done.yml`. `bmad-build` would write a flat `spec-<slug>.md`; the
`STORY = SPEC` fact in [`_bmad/custom/bmad-build.toml`](../../_bmad/custom/bmad-build.toml) makes the
story file `stories/<key>.md` **the spec itself**, so there is one file per story and every merge gate
can see it. Do **not** move the folder without updating that automation.

## The story lifecycle (`bmad-build`)

One skill takes a story from intent to a reviewed working tree: `bmad-build <story-key>`. A story always
takes its **full route** (the override forbids the one-shot shortcut), so it stops at an approval
checkpoint after planning. Drafting, refining and building a story are one flow that can be split across
sessions: _Approve and stop_ leaves the spec `ready-for-dev`, and a fresh `bmad-build <story-key>`
resumes at implementation.

For a **new** story the override writes a one-entry, git-ignored `stories.yaml` and sends step 1 down its
own spec-folder route. The whole of step 1 then runs (epic context, previous-story continuity, the
clean-tree and branch check, the scope check) and the spec still lands at `stories/<key>.md`. An
**existing** spec is resumed by its status, which skips that block, so the branch and tree checks are made
by hand first (the `BRANCH AND TREE` fact).

| Moment                        | Spec `status` (frontmatter)           | Tracker         | Set by                                                                               |
| ----------------------------- | ------------------------------------- | --------------- | ------------------------------------------------------------------------------------ |
| Story is in the plan          | no file yet                           | `backlog`       | planning, by hand (the key must exist; the skill never adds one)                     |
| `bmad-build <key>` plans      | `draft`                               | `backlog`       | STORY RESOLUTION writes `stories.yaml`; step 1 loads context; step 2 writes the spec |
| Spec approved at checkpoint 1 | `ready-for-dev`                       | `ready-for-dev` | step 2, plus the TRACKER AT APPROVAL fact                                            |
| Implementation starts         | `in-progress` (and `baseline_commit`) | `in-progress`   | step 3                                                                               |
| Built-in review               | `in-review`                           | `in-progress`   | step 4                                                                               |
| The run ends                  | `in-review`                           | `review`        | step 5 writes `done` and `review`; `on_complete` moves the spec back to `in-review`  |
| PR open, human review         | `in-review`                           | `review`        | —                                                                                    |
| PR merged                     | `done`                                | `done`          | `scripts/mark-story-done.mjs`, in a `[skip ci]` bot commit                           |

- **`done` means merged.** `bmad-build` itself writes `done` when its run ends; `on_complete` undoes
  that, and `mark-story-done` also accepts the pair (spec `done`, tracker `review`), so a skipped step
  cannot strand a story at `review`.
- **Two file shapes are read.** New stories use the spec template (Intent, Boundaries & Constraints,
  I/O & Edge-Case Matrix, Code Map, Tasks & Acceptance, Implementation Notes, Review Triage Log,
  Verification) with `status` in the frontmatter. Older stories keep the classic layout: most have a
  `Status:` line in the body, and a few keep the status in a table row that no reader parses, so the
  merge automation cannot advance those. `scripts/lib/story-status.mjs` reads both shapes, but
  `bmad-build` itself only resumes specs: pointed at a classic story file it stops and asks, because
  step 1 would otherwise fork a second, flat spec from it. The open stories that still have classic
  files have to be converted or re-planned before they go through it.
- **The one-shot route is for work without a story.** Step 2 can send a small change with no open
  questions down a one-shot route: no approval checkpoint, one reviewer, no acceptance-criteria
  section, and a commit of its own. The override forbids it for stories, and the commit gate still
  covers the `chore:` and `docs:` work that may use it.
- **`bmad-build` does not commit**, at its last step or in the one-shot step. It leaves the working tree
  for review (`bmad-walkthrough` is the guided way); atomic commits, the push and the PR follow the
  approval ([AGENTS.md](../../AGENTS.md)).
- **Deferrals live in the story.** Anything a step defers goes under `### Found, not fixed` in the
  spec's Implementation Notes, which is what a follow-up issue is filed from. `deferred-work.md`,
  `spec-*.md`, `epic-*-context.md` and `stories.yaml` in this folder are git-ignored scratch.

## `sprint-status.yaml` schema

### Vanilla BMAD (parsed + validated by the tools)

- Metadata: `generated`, `last_updated`, `project`, `project_key` (`NOKEY`), `tracking_system`,
  `story_location`.
- `development_status:` — a flat map of `epic-N`, `{epic}-{story}-{slug}`, and `epic-N-retrospective`
  keys to a status.
  - Epic status: `backlog → in-progress → done`
  - Story status: `backlog → drafted → ready-for-dev → in-progress → review → done`
    (`drafted` is legacy; BMAD readers map it to `ready-for-dev`.)
  - Retrospective status: `optional ↔ done`
- `action_items:` — list of `{ epic, action, owner, status }`.

### Project extensions (non-vanilla — tolerated, documented, kept truthful)

These are deliberate. BMAD readers ignore/tolerate them; validate-mode will list them as
non-standard, which is expected.

1. **Sprint blocks** — top-level `last_sprint`, `current_sprint`, `next_sprint`, each with
   `number / name / goal / status / epics / stories / waves / notes / retrospective`. Their status
   vocabulary is `proposed → planned → in-progress → completed`. Vanilla BMAD neither emits nor
   parses these; they are the live sprint record. **Sprints are advanced by editing these blocks
   directly** (a manual `next → current → last` roll-over), not by regenerating the file.
2. **Terminal statuses** beyond the vanilla set, kept truthful instead of faked as `done`:
   - `cancelled` — work consciously dropped (e.g. `11-3`, `11-4`).
   - `absorbed` / `absorbed-into-epic-N` — scope delivered under another epic (Epic 8 → Epic 13).
3. **Epic completion dates** — inline comments on the epic line (`epic-1: done # completed 2026-01-07`),
   never separate `epic-N-completed` keys (those are illegal `development_status` keys).
4. **`action_items`** entries also carry a `category` field and may use a `parked` status.

## Running the BMAD skills safely

- **`bmad-build`** is configured by `_bmad/custom/bmad-build.toml`; the lifecycle above is what that
  file produces, and its `persistent_facts` are the contract, so read them before changing the flow.
  It has not yet been run end to end on a real story: the first one is the test, so report anything
  that drifts (a spec outside `stories/`, `done` before the merge, a commit made).
- **`bmad-sprint-planning`** is guarded by `_bmad/custom/bmad-sprint-planning.toml`, and the guard is a
  **prohibition**: never run its `generate` intent, or the fix flow that uses it, against this tracker.
  The 6.12 `generate` step derives every key from the `docs/epics.md` headings, and this tracker's
  slugs are hand-chosen, so it would drop about 110 entries as orphans (84 of them done, plus a live
  in-progress story and a live ready-for-dev one), add fresh `backlog` keys in their place, and strip
  every inline comment. Allowed: the readiness gate, `status` and `validate`. On this tracker `validate`
  reports 12 problems (nine terminal statuses, two keys that predate the numeric convention, one
  `parked` action item), all documented here, so that is expected.
- **Removed skills.** The install runs with `installShims: false`, so the v6 compatibility shims
  (`bmad-create-story`, `bmad-dev-story`, `bmad-sprint-status`, `bmad-quick-dev`, …) are not present;
  upstream removes them in v7 anyway. `bmad-sprint-status` is now `bmad-sprint-planning`'s `status`
  view.

## Path anchor

Artifact locations are pinned to `docs/` in **two** places, because BMAD 6.12 has two config channels
and each skill reads exactly one of them:

| Channel                                        | Files                                                                     | Read by                                                                                                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TOML chain (`resolve_config.py`, the renderer) | `_bmad/config.toml`, then `_bmad/custom/config.toml`, which wins          | `bmad-build`, `bmad-help`, `bmad-spec`, `bmad-architecture`, `bmad-project-context`, `bmad-deep-recon`                                                           |
| Per-module yaml                                | `_bmad/bmm/config.yaml`, `_bmad/tea/config.yaml` (and the other modules') | `bmad-sprint-planning`, `bmad-correct-course`, `bmad-retrospective`, `bmad-code-review`, `bmad-create-epics-and-stories`, the PRD and UX skills, every TEA skill |

`_bmad/custom/config.toml` only reaches the first channel. The yaml files are installer output, so the
pins reach them through the installer's own answers (`--set`, below), which it remembers on later
upgrades. It matters because `_bmad-output/` is gitignored: a skill that reads an unpinned yaml writes
where git never looks.

## Upgrading BMAD

An upgrade regenerates `_bmad/`, `.claude/skills/`, `.agents/skills/` and `.github/agents/`. All four are
committed and prettier-ignored, so they stay byte-identical to the installer's output. The yaml pins
survive a plain `quick-update`; if the answers are ever lost, this re-applies them:

```bash
npx bmad-method@latest install --action update --yes --no-shims --all-stable \
  --modules bmm,bmb,cis,tea --tools claude-code,cursor,github-copilot \
  --set 'bmm.planning_artifacts={project-root}/docs' \
  --set 'bmm.implementation_artifacts={project-root}/docs/sprint-artifacts' \
  --set 'tea.test_artifacts={project-root}/docs/sprint-artifacts' \
  --set 'tea.test_design_output=docs/sprint-artifacts/test-design' \
  --set 'tea.test_review_output=docs/sprint-artifacts/test-reviews' \
  --set 'tea.trace_output=docs/sprint-artifacts/traceability'
```

After any upgrade, check that nothing slipped back to `_bmad-output/`:

```bash
grep -n artifacts _bmad/bmm/config.yaml _bmad/tea/config.yaml
uv run _bmad/scripts/resolve_config.py --project-root .
```

- `--no-shims` is deliberate (see above). Use `--all-stable`, not `--pin`: a pin flips the external
  modules' recorded channel to `pinned`.
- If the installer leaves a `*.bak` beside a config file, delete it: it is a copy of the previous state,
  not something to commit.
- `--set` patches the yaml files after the installer writes its hash manifest, so `bmm/config.yaml` and
  `tea/config.yaml` differ from their `files-manifest.csv` entries. That is expected.
