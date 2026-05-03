# Story 14.1: Household Collaboration — High-Level Epic Draft

## Story Information

| Field        | Value                        |
| ------------ | ---------------------------- |
| **Story ID** | 14-1                         |
| **Epic**     | 14 - Household Collaboration |
| **Sprint**   | Next sprint                  |
| **Status**   | Backlog                      |
| **Priority** | Medium                       |
| **Estimate** | 2 points                     |
| **Owners**   | PM: Ifero · Dev: — · QA: —   |

---

## Story

As the product owner,
I want to define the phase-2 Household Collaboration epic and its high-level stories,
so that the team can discuss and align on shared household functionality, data model, and privacy boundaries.

## Context

This story captures the new Phase 2 direction for household-based sharing within myLoyaltyCards. The app will evolve from a personal loyalty card manager into a collaborative household utility that supports shared shopping lists, shared bills, and optional household-visible cards.

This epic is intentionally scoped as Phase 2 growth work and should be discussed after Sprint 13 completes the current internationalisation and watch reliability work.

## Key Focus Areas

### 14-1 Create household membership

- Define a household entity and membership model
- Allow users to create or join a household
- Support household roles and basic settings
- Establish privacy defaults for household membership

### 14-2 Share household shopping list

- Create a shared shopping list for household members
- Allow adding, editing, and removing items
- Enable members to mark items purchased
- Sync list updates across household members

### 14-3 Share household bills

- Allow household members to add shared bills or expenses
- Assign shares to members and track paid/unpaid status
- Display household bill history
- Support basic bill splitting and settlement status

### 14-4 Share household-visible cards

- Allow users to mark cards as household-visible
- Display shared cards in a household context
- Provide per-card visibility controls and privacy options
- Ensure household members only see cards explicitly shared to the household

### 14-5 Household sync and conflict resolution

- Sync household data across devices and users
- Resolve simultaneous edits safely with clear rules
- Handle offline edits and merge behavior for shared household state
- Maintain data ownership and visibility boundaries

## Acceptance Criteria

- AC1 — The team has reviewed and aligned on the Household Collaboration epic scope.
- AC2 — The PRD now includes Household Collaboration as a Phase 2 feature area.
- AC3 — Sprint backlog includes Epic 14 with the five high-level household stories.
- AC4 — Data model, privacy, and sync discussion points are captured for follow-up.
- AC5 — A discovery plan is documented for the next phase of implementation.

## Discovery Plan

- Use `docs/analysis/household-collaboration-discovery-plan.md` as the structured agenda for team discovery.
- Capture data model decisions, privacy rules, UX flows, and sync strategy.
- Identify the smallest viable first implementation slice for Epic 14.

## Tasks

- [ ] Run a household collaboration discovery session with the product team.
- [ ] Document the household membership model and privacy rules.
- [ ] Define the first implementation slice and map it to Epic 14 stories.
- [ ] Capture UX wireframe expectations and sync requirements.
- [ ] Record the validated discovery output in the PRD or planning artifact.

## Notes

This is a planning artifact for alignment and does not represent implementation work yet.
