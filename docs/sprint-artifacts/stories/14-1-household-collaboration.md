# Story 14.1: Household Collaboration — High-Level Epic Draft

Status: backlog

## Story

As the product owner,
I want to define the phase-2 Household Collaboration epic and its high-level stories,
so that the team can discuss and align on shared household functionality, data model, and privacy boundaries.

## Context

This story captures the new Phase 2 direction for household-based sharing within myLoyaltyCards. The app will evolve from a personal loyalty card manager into a collaborative household utility that supports shared shopping lists, shared bills, and optional household-visible cards.

This epic is intentionally scoped as Phase 2 growth work and should be discussed after Sprint 12 finishes the current CI/CD and TestFlight delivery goals.

## High-Level Stories

### 14-1 Create household membership
- Define a household entity and membership model
- Allow users to create a household, join an existing household, and invite members
- Support household roles and basic household settings
- Establish privacy defaults for new households

### 14-2 Share household shopping list
- Create a shared shopping list for household members
- Allow adding, editing, and removing items
- Enable household members to mark items purchased
- Sync list updates across household members

### 14-3 Share household bills
- Allow household members to add shared bills or expenses
- Assign bill shares to members and track paid/unpaid status
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

- The team has reviewed and aligned on the Household Collaboration epic scope
- The PRD now includes Household Collaboration as a Phase 2 feature area
- Sprint backlog includes a new Epic 14 with the five high-level household stories
- Team discussion points are identified for data model, privacy, sync, and UX

## Discussion Questions

- What are the minimum household membership and invitation flows?
- Which shared data should be supported first: shopping list, bills, or cards?
- What privacy controls should household members have for shared cards?
- How should household sync behave when members are offline or disconnected?
- Should household collaboration be split into separate epics for groups and finance?

## Discovery Plan

- Use `docs/analysis/household-collaboration-discovery-plan.md` as the structured agenda for in-depth team discovery.
- Capture data model decisions, privacy rules, UX flows, and sync strategy there before implementation.

## Notes

This is a planning artifact for team alignment and does not represent implementation work yet.
