# Sprint Change Proposal — Watch Sort Parity (Epic 9)

- **Date:** 2026-06-09
- **Author:** Amelia (Dev agent) via `correct-course`
- **Trigger story:** 9.4 — Sync Sorting to Watch (implemented, **held**, unmerged)
- **Sprint / Epic:** Sprint 15 / Epic 9 — Smart Card Sorting
- **Working mode:** Incremental
- **Status:** ✅ APPROVED by ifero — 2026-06-09
- **Scope classification:** **MAJOR** (PM + Architect + UX gating before new stories are dev-ready)

> **Approved decisions (2026-06-09):**
>
> 1. Proposal **approved** as written.
> 2. **C3 folded into Story 9.4** — 9.4 re-opened to add the watch favourite badge before it ships.
> 3. Watch sort = **independent watch preference, default A‑Z** (not mirrored from the phone).

---

## Section 1 — Issue Summary

While reviewing Story 9.4 on a real device pair (phone + Apple Watch Ultra), three issues surfaced with the Watch sorting/favourite experience. They are **connected**: the watch in the screenshots runs **pre-9.4 code** (9.4 is held/unmerged and the watch wasn't rebuilt), so it has no favourite tier at all.

**Evidence (device screenshots, 2026-06-09):**

- **Phone** (sort = "Frequently used"): favourites **Tigotà ⭐, Coop ⭐, UniClub ⭐** grouped on top, star-badged.
- **Watch** ("Carte"): order is **Stroili, Tigotà, Coop, UniClub** — a non-favourite (Stroili) sits on top, favourites are **not** grouped first, and **no star/pin appears anywhere**.

**The three change items:**

- **C1 — User-selectable Watch sort.** The phone already ships a persisted, user-selectable 3-mode sort (`frequent` / `recent` / `az`) via Story 13.2's `useCardSort` + `SortFilterRow`. The watch has no equivalent — it mirrors a single hardcoded order. Request: bring a sort picker to the watch, **default A‑Z**, persisted. _(So C1 is "port an existing phone pattern," not greenfield.)_
- **C2 — Count card opens on the Watch.** Opening a card on the watch never increments `usageCount`/`lastUsedAt`. Because that counter is shared phone+watch, watch-driven usage is lost — so FR21 (frequency) and FR22 (recency) are under-counted and "most-used at top" is wrong on **both** surfaces for a watch-heavy user.
- **C3 — Favourite (pin) indicator on the Watch.** Even after 9.4 groups favourites first, the watch shows **no star/pin** — so the user can't tell _why_ cards are ordered that way. Story 9.2's favourite badge is phone-only.

**Why this is correct-course material:** C1 adds a capability beyond Epic 9's "automatic sort" premise (and beyond the PRD's automatic FRs); C2 crosses the deliberate **"watch read-only for MVP"** architecture decision; C3 completes a favourite UX that 9.4 leaves half-delivered.

---

## Section 2 — Impact Analysis

### Epic Impact

- **Epic 9 (Smart Card Sorting):** Its four stories are deliverable, **but its own goal — "most-used at top … applies to both phone and watch" — is only partially met on the watch.** C2 (usage) and C3 (visible favourites) are _gaps in the existing goal_; C1 is a _new capability_. **Recommendation: extend Epic 9** with new stories rather than redefine it or open a new epic. (Placement nuance: the phone selector shipped under Epic 13, and these are watch-app changes that also touch Epic 5 (Apple Watch App) — but the sorting domain + the "both surfaces" promise make Epic 9 the natural home.)
- **Epic 10 (Wear OS, backlog) — materially impacted.** Its scope says _"Watch is READ-ONLY (consistent with watchOS behavior)"_ and _"same sync protocol as watchOS."_ The C2 read-only refinement and the C1/C3 parity features **set a precedent Wear OS must follow**. Epic 10's scope and read-only note are updated by this proposal (see §4).
- No epic is invalidated; no brand-new epic required.

### Story Impact

- **9.4 (held):** correct and foundational — **fold C3 (favourite badge) in** so it ships a coherent, complete favourite-on-watch increment rather than "favourites on top but invisible."
- **New: 9.5** (selectable watch sort / C1), **9.6** (watch usage counting / C2), **9.6a** (architecture spike/ADR gating 9.6).
- 9.1 / 9.2 / 9.3 — done, unaffected.

### Artifact Conflicts

| Artifact                                   | Impact                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PRD** (`docs/prd.md`)                    | Add **FR25** (selectable sort per surface, persisted) — the phone already does this, so the PRD is already behind reality. Add **FR26** (usage counted on every display surface incl. watch). Note a watch **A‑Z default** intentionally diverges from FR22's "most-recent-first." No PRD conflict for C2 (read-only is not a PRD rule). |
| **Architecture** (`docs/architecture.md`)  | **C2 (significant):** new watch→phone `CARD_USED` message type; conflict-free reconciliation (commutative increments + `max(lastUsedAt)`); refine the read-only decision. **C1 (minor):** watch-side preference storage.                                                                                                                 |
| **project_context.md**                     | Update "Watch App Rules" + "Sync Patterns" read-only lines (§237, §324) and the message-type list.                                                                                                                                                                                                                                       |
| **CONTRIBUTING.md**                        | Refine line 270 ("never add mutation paths") to the data-editing-vs-usage-event distinction.                                                                                                                                                                                                                                             |
| **epics.md**                               | Epic 9: add 9.5/9.6/9.6a + 9.4 AC. Epic 10: update read-only note (`:1922`) + add parity scope. Refine ARCH-20 (`:266`) and `:1008`.                                                                                                                                                                                                     |
| **UX** (`docs/ux-design-specification.md`) | Add watch **sort picker** spec (C1) and watch **favourite badge** spec (C3), both in the watch "Carbon Utility" style.                                                                                                                                                                                                                   |
| **sprint-status.yaml**                     | Add `9-5`, `9-6`, `9-6a` under Epic 9 (applied on approval — §6.4).                                                                                                                                                                                                                                                                      |

### Technical Impact

- **Read-only is enshrined in 7 places across 5 files** (CONTRIBUTING ×1, project_context ×2, architecture ×1, epics ×3). Every reference is qualified as _card-data editing_ on the phone — so C2 is a **refinement, not a reversal**: the watch stays read-only for card data; it gains a _usage-event_ channel that is commutative and conflict-free.
- C2 touches both phone (event handler + increment) and watch (event emit + offline queue) and the sync protocol (message versioning).
- C3 and C1 build on 9.4's `isFavorite` sync; C3 is pure watch UI; C1 needs watch-local persistence + a watch picker.
- Aligns with the **Sprint 14 retro action items** already on record: "Spike-first for Watch/native APIs" and "Mandatory API-currency check before any Apple-platform story" → reflected as story 9.6a + an API-currency AC.

---

## Section 3 — Recommended Approach

**Path: HYBRID — Direct Adjustment (extend Epic 9), with a PM/Architect gate on C2.**

Rollback was rejected (9.1–9.4 are the foundation the changes build on). An MVP review applies only to C2, which crosses the deliberate "read-only **for MVP**" line — handled via a PM scope confirmation + Architect ADR rather than a scope cut.

**Sequenced by effort/risk so value lands early and the risky change is fenced:**

| #   | Story               | Change                                                                            | Effort  | Risk    | Gate                           |
| --- | ------------------- | --------------------------------------------------------------------------------- | ------- | ------- | ------------------------------ |
| 1   | **9.4 (+ fold C3)** | favourite sync/sort **+ visible star** on watch                                   | Low add | Low     | none — ship coherent increment |
| 2   | **9.5**             | selectable watch sort; ports `frequent`/`recent`/`az`; **A‑Z default**; persisted | Medium  | Low‑Med | UX (watch picker) + PRD FR25   |
| 3   | **9.6a**            | Architect ADR: usage-event channel + read-only refinement + Wear OS consistency   | Low‑Med | —       | spike-first (per retro)        |
| 4   | **9.6**             | watch→phone `CARD_USED`; phone increments; offline queue                          | High    | Med     | 9.6a ADR + PM scope confirm    |

**Rationale:** preserves all done work; delivers visible value fast (badge + selectable sort) without waiting on C2; isolates the architecture-touching C2 behind a proper decision so the "prevent conflicts" rationale is honoured; keeps everything coherent under Epic 9 while updating Epic 10 for cross-platform consistency.

**Timeline:** 9.4(+C3) and 9.5 fit the current sprint's tail; 9.6a (spike) + 9.6 likely spill to the next sprint (architecture gate).

---

## Section 4 — Detailed Change Proposals

### 4.1 Stories

**MODIFY — Story 9.4 (add AC6 + task):**

```
Section: Acceptance Criteria
NEW AC6:
  Given a synced card has isFavorite = true
  When I view the Watch card list
  Then the row shows a favourite indicator (star/pin badge)
  And it is visually consistent with the phone's star badge

Section: Tasks
NEW: Add a compact favourite badge to the Watch CardRowView (Carbon Utility style),
     driven by the already-synced WatchCard.isFavorite. Add a snapshot/render test.

Rationale: 9.4 already syncs + sorts isFavorite; without a visible badge the favourite-first
order is unexplained (device-verified gap). Folding it in ships one coherent increment.
```

**NEW — Story 9.5: Selectable Watch Sort**

```
As a user, I want to choose how cards are sorted on my Watch,
so the order matches how I think about my cards.

Acceptance Criteria:
1. The Watch list offers a sort control (toolbar button → picker), themed Carbon Utility.
2. Modes mirror the phone semantics: Frequently used / Recently added / A‑Z.
3. Default = A‑Z.
4. The choice persists on the Watch across launches (watch-local storage).
5. Changing the mode re-orders the list immediately.
6. (API currency) Picker uses current SwiftUI APIs — verified via Context7/official docs.

Decided (2026-06-09): INDEPENDENT watch preference (its own persisted choice, default A‑Z).
Depends on: 9.4. Needs: PRD FR25, UX watch-picker spec.
```

**NEW — Story 9.6a: Watch Usage-Event Architecture (Spike/ADR)** _(Architect)_

```
Produce an ADR that:
- Designs a watch→phone usage-event channel (e.g. message type CARD_USED { id, usedAt }).
- Proves conflict-free reconciliation (usageCount increments are commutative; lastUsedAt = max).
- Refines the "watch read-only" rule → "read-only for card DATA; usage events permitted."
- Specifies offline behaviour (queue on watch, flush on reachability).
- Ensures Wear OS (Epic 10) can adopt the same protocol.
Output: ADR + the exact doc edits in §4.2–§4.5. Spike-first per Sprint 14 retro.
```

**NEW — Story 9.6: Count Card Opens on the Watch** _(gated by 9.6a)_

```
As a user, I want opening a card on my Watch to count toward usage,
so "most used" is accurate on both Watch and phone.

Acceptance Criteria:
1. Opening a card on the Watch emits a usage event to the phone.
2. The phone increments usageCount and sets lastUsedAt (commutative; no edit conflict).
3. Works offline: events queue on the Watch and flush when the phone is reachable.
4. The Watch remains read-only for card DATA (no create/edit/delete/favourite from watch).
5. Re-sync reflects updated usage back to the Watch list ordering.
Depends on: 9.6a ADR, PM scope confirmation.
```

### 4.2 PRD (`docs/prd.md`)

```
ADD under "Smart Card Sorting":
FR25: Users can select the card sort mode (Frequently used / Recently added / A‑Z)
      on each surface (phone, watch); the selection persists per surface.
FR26: Card usage (usageCount, lastUsedAt) is recorded whenever a card's barcode is
      displayed on any surface, including the watch.
NOTE: A watch A‑Z default is intentional and diverges from FR22's most-recent-first default.
```

### 4.3 Architecture (`docs/architecture.md`) + `project_context.md` + `CONTRIBUTING.md`

```
OLD (architecture.md:1029):           - Watch is READ-ONLY for MVP
OLD (project_context.md:237):         - **Watch is READ-ONLY** for MVP (prevents conflicts)
OLD (project_context.md:324):         - Watch is **READ-ONLY** for MVP
OLD (CONTRIBUTING.md:270):            - **Apple Watch is read-only** — never add mutation paths to the watch.

NEW (consistent wording, all sites):
  - Watch is READ-ONLY for card DATA — create/edit/delete/favourite happen only on the phone.
    The watch MAY emit usage events (card-opened); the phone applies them as commutative
    increments (usageCount += 1, lastUsedAt = max). This preserves the no-edit-conflict guarantee.

ALSO (architecture.md sync section + project_context.md message versioning):
  ADD message type: CARD_USED (watch → phone) to the versioned SyncMessage union.
```

### 4.4 Epic 9 (`docs/epics.md`)

```
- Add stories 9.5, 9.6a, 9.6 (as drafted in §4.1).
- Update Story 9.4 AC (favourite badge).
- Clarify Epic 9 scope line: "Sorting applies to both phone and watch, including visible
  favourites, watch-side usage counting, and a per-surface user-selectable sort mode."
- Refine ARCH-20 (epics.md:266) and :1008 to the data-vs-usage wording from §4.3.
```

### 4.5 Epic 10 — Wear OS (`docs/epics.md:~1898–1924`) ← _explicit stakeholder ask_

```
OLD (epics.md:1922): - Watch is READ-ONLY (consistent with watchOS behavior)
NEW:                 - Watch is READ-ONLY for card data (consistent with watchOS); usage
                       events (card-opened) are emitted to the phone via the shared protocol.

ADD to Epic 10 scope (parity with watchOS):
  - Per-surface selectable sort (frequent / recent / A‑Z), persisted (mirror Story 9.5).
  - Favourite (pin) indicator on rows (mirror Story 9.4/C3).
  - Usage-event emission (mirror Story 9.6).
```

### 4.6 UX (`docs/ux-design-specification.md`)

```
ADD:
- Watch sort control: toolbar/overlay button → compact picker list (frequent/recent/az),
  Carbon Utility styling, legible at 49mm and smaller.
- Watch favourite badge: compact star/pin on the card row, consistent with the phone star,
  non-intrusive on the small screen.
```

---

## Section 5 — Implementation Handoff

**Scope: MAJOR** — planning gates precede dev.

| Role             | Responsibility                                                                                      | Deliverable                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **PM**           | Approve FR25/FR26; confirm C2 is pulled past the "read-only-for-MVP" line                           | PRD edits (§4.2)                                                |
| **Architect**    | Story 9.6a ADR: usage-event channel, conflict-free proof, read-only refinement, Wear OS consistency | ADR + arch/project_context/CONTRIBUTING/epics edits (§4.3–§4.5) |
| **UX**           | Watch sort picker + watch favourite badge specs                                                     | UX edits (§4.6)                                                 |
| **SM**           | Draft stories 9.5, 9.6a, 9.6; add to `sprint-status.yaml`                                           | Story files + board entries                                     |
| **Dev (Amelia)** | Fold C3 into 9.4; implement 9.5 then 9.6 after specs land                                           | Code + tests, per-story                                         |

**Success criteria:**

- 9.4: favourites visibly badged on the watch; existing 9.4 ACs still pass.
- 9.5: A‑Z default; mode persists; phone↔watch behave consistently per the chosen mirror/independent decision.
- 9.6: watch opens reflected in `usageCount`/`lastUsedAt` on both surfaces; offline-safe; no card-edit conflicts; read-only-for-data preserved.
- Epic 10 + all 7 read-only references updated consistently.

**Immediate next steps after approval:**

1. Update `sprint-status.yaml` (add 9-5, 9-6a, 9-6 under Epic 9). _(This workflow performs this step.)_
2. Decide the disposition of held Story 9.4: ship as-is now, or re-open to fold in C3 first.
3. Route the ADR (9.6a) and PRD/UX edits to the Architect/PM/UX agents.
