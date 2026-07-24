# Sprint Artifacts

This folder holds the project's BMAD sprint-tracking artifacts. It is **BMAD 6.10-compliant**, with
a small set of **documented extensions** that the BMAD readers tolerate. This README is the reference
for those extensions — it is loaded as a persistent fact by the customized sprint skills.

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

## Why story files live in `stories/`

The story-status automation hardcodes this path — `scripts/lib/story-refs.mjs`,
`scripts/mark-story-done.mjs`, `scripts/check-pr-conventions.mjs`, and
`.github/workflows/mark-story-done.yml`. Vanilla `create-story` writes new story files flat to
`docs/sprint-artifacts/`; the `_bmad/custom/bmad-create-story.toml` `on_complete` hook relocates each
new file into `stories/` so the automation keeps working. Do **not** move the folder without updating
that automation.

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

- **`bmad-sprint-planning`** is guarded by `_bmad/custom/bmad-sprint-planning.toml`: its `on_complete`
  instruction preserves the sprint blocks + `action_items` verbatim and only merges
  `development_status` (never downgrading). Without that guard a vanilla run would strip the sprint
  blocks — do not remove it.
- **`bmad-create-story`** is guarded by `_bmad/custom/bmad-create-story.toml`: relocates new story
  files into `stories/`. **Trade-off:** because story files sit in `stories/` (not the flat
  `implementation_artifacts` root), `bmad-sprint-planning`'s "story file exists → `ready-for-dev`"
  auto-detection never fires. That is expected — story statuses are maintained explicitly in the
  tracker and by the story-status automation, not inferred from file presence.
- **`bmad-sprint-status`** (read-only) parses `development_status` + `action_items` and tolerates the
  extensions.

## Path anchor

Artifact locations are pinned to `docs/` in `_bmad/custom/config.toml` (bmm + tea modules), which
survives BMAD installer regeneration. That file is the durable compliance anchor — keep it intact.
