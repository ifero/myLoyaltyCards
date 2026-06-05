# Story 14.5a: Household Cards UX Design

## Story Information

| Field          | Value                         |
| -------------- | ----------------------------- |
| **Story ID**   | 14-5a                         |
| **Epic**       | 14 - Household Collaboration  |
| **Sprint**     | TBD (Phase B — design spike)  |
| **Status**     | Backlog                       |
| **Priority**   | Medium                        |
| **Estimate**   | 2 points                      |
| **Owners**     | PM: Ifero · UX: — · Dev: —    |
| **Blocks**     | 14-5 (Household Card Sharing) |
| **Depends on** | 14-4 (Household Membership)   |

---

## Story

As a UX designer,
I want to define the placement, layout, and interaction patterns for household cards in the card list,
so that the implementation team has a clear, approved design before building story 14-5.

## Context

The existing card list is a single-user personal collection. Story 14-5 introduces a second category — household-visible cards — that belongs to other members. Without a deliberate UX decision on placement and visual treatment, implementation risks an inconsistent or confusing experience.

This is a design spike story. Output is a set of annotated wireframes or a Figma design that resolves the open questions below. No code is produced.

**14-5 cannot begin until this story is approved by Ifero.**

## Open Design Questions to Resolve

1. **Placement** — Are household cards shown inline in the existing card list (with a visual separator or badge), or in a separate tab/section? Inline feels discoverable; separate tab feels cleaner but adds navigation.

2. **Visual treatment** — How is a household card distinguished from a personal card? Options: owner avatar badge, household icon, different card background tint, or a dedicated "Household" label row.

3. **Empty state** — What does a household member see when no cards have been shared yet? Must not confuse them into thinking the feature is broken.

4. **Owner attribution** — How prominently is the card owner shown? Name only, avatar, or both?

5. **Actions available to a non-owner** — Can a member tap a household card to view its barcode? Can they add it to their own wallet (deeplink-style copy)? Or is it view-only?

6. **Interaction when unshared** — If an owner unshares a card mid-session, does the card animate out or disappear on next foreground? Visual feedback to the member needed?

## Acceptance Criteria

- AC1 — Wireframes or Figma screens cover: card list with household cards present, card list empty household state, household card detail view (what a non-owner sees).
- AC2 — All 6 open design questions above are explicitly answered in the design or accompanying annotations.
- AC3 — The visual treatment for household cards is consistent with the existing design system and NativeWind styling conventions.
- AC4 — The design is reviewed and approved by Ifero before story 14-5 moves to refinement.
- AC5 — Approved design is linked from story 14-5 and stored in `docs/ux-designs/` or the Figma file.

## Tasks

- [ ] Review existing card list UI and design system components
- [ ] Sketch layout options for inline vs separate section placement
- [ ] Produce wireframes or Figma screens covering the three key views (AC1)
- [ ] Annotate answers to all 6 open design questions
- [ ] Present to Ifero for approval
- [ ] Link approved design in story 14-5 and store artefact in `docs/ux-designs/14-5-household-cards/`
