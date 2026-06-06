# Story 14.1: Household Collaboration — Epic Scoping & Discovery

## Story Information

| Field        | Value                        |
| ------------ | ---------------------------- |
| **Story ID** | 14-1                         |
| **Epic**     | 14 - Household Collaboration |
| **Sprint**   | Next sprint                  |
| **Status**   | Done                         |
| **Priority** | Medium                       |
| **Estimate** | 2 points                     |
| **Owners**   | PM: Ifero · Dev: — · QA: —   |

---

## Story

As the product owner,
I want to define and align on the scoped Epic 14 plan — covering card sharing, shopping list, and household layer —
so that the team has clear phases, caveats resolved, and ready-to-refine stories before any implementation begins.

## Context

Epic 14 evolves myLoyaltyCards from a single-user loyalty card manager into a lightweight collaborative tool. Based on scoping, the epic is split into two explicit phases:

**Phase A — Single-user features (no household required):**

- Card sharing via deeplink (P2P, no account needed)
- Shopping list (local, single-user, no account needed)

**Phase B — Household layer (cloud account required):**

- Household membership (create/join, roles)
- Household card sharing (visibility within household, builds on Phase A card sharing)
- Household shopping list sync (builds on Phase A shopping list)

Both Phase A features must work fully in **local mode** (no account). The household layer is additive — it does not replace or gate the single-user experience.

Bill splitting has been **explicitly descoped** from Epic 14. It may be revisited as its own epic.

---

## Phase A: Caveats to Succeed

### 14-2 — Card Sharing via Deeplink

**How it works:** User taps "Share card" → app generates a deeplink URL → recipient opens link → app creates the card locally on their device.

**Payload design:**

- Encode only structured card data as base64 JSON: `{ name, barcodeValue, barcodeFormat, brandId?, color? }`
- Do **not** encode image data — images are resolved from the catalogue by `brandId` on import
- Keep payload under ~800 bytes to survive URL truncation in SMS and messaging apps

**Caveats:**

- `myloyaltycards://` URI scheme is already registered in `app.json` — deeplink routing is available
- Expo Router must handle a route like `/card/import?data=<base64>` for both cold-start and in-app scenarios
- **App not installed:** deeplink silently fails — no HTTPS fallback for MVP. Decision: accepted. Mitigation: the share sheet should include a plain-text fallback ("Copy card code") so the sender can paste the payload into a message manually if the link fails
- **Duplicate detection:** if the recipient already has a card with the same `barcodeValue`, the app must show a conflict UI (don't silently overwrite)
- **Malformed payload:** validate and sanitize the base64 payload on import; never crash on bad input
- Works in **local mode and cloud mode** — no auth check on card import
- **Android note:** App Links require a `.well-known/assetlinks.json` file on the web domain; needs to be provisioned alongside Universal Links config for iOS

### 14-3 — Shopping List (Single User)

**How it works:** A simple persistent list of items. User can add, remove, and tick items. No sync, no sharing in Phase A.

**Caveats:**

- Stored in `expo-sqlite` (already a project dependency)
- Schema must use **UUID primary keys** (not SQLite autoincrement), so items are cloud-migrateable when household sync is added in Phase B
- Available in **local mode** with no account — list persists via local SQLite only
- **Local → cloud migration:** when a local-mode user creates an account, shopping list items must migrate using the existing guest-migration pattern (`core/auth/guest-migration.ts`)
- Single list per user for MVP — do not build multi-list UI
- **Watch scope:** shopping list is NOT shown on the watch app in Phase A (defer to Phase B or Epic 15)
- Sort order: order of addition (most recent at top); no alphabetical sort in MVP

---

## Phase B: Caveats to Succeed

### 14-4 — Household Membership

**Caveats:**

- Requires cloud account — do not show household entry point in local mode (show upgrade prompt instead)
- **Household ownership transfer:** when the owner initiates account deletion, they are shown two prompts before deletion proceeds:
  1. **Nominate a successor** — required; owner must pick an existing household member to become the new owner (cannot skip; account deletion is blocked until nominated or household is dissolved)
  2. **Shared card disposition** — owner's personal cards are deleted with the account (GDPR). For cards the owner had marked household-visible: a single binary prompt — "Transfer shared cards to [nominee]" or "Remove shared cards from household". No per-card prompting.
- If the household has no other members, account deletion dissolves the household with no prompts needed
- **Membership model:** owner + members only for MVP (no guest tier)
- **Invite mechanism:** must use a secure, short-lived token (not a guessable public code). Token expiry: 48h suggested
- **Max members:** capped at **6 members per household** for MVP (owner + 5). Enforced server-side; invite link returns an error if household is full
- **GDPR:** informed consent shown at household join time (not buried in ToS). A member must be able to leave and delete their contributed data without breaking the household for others

### 14-5 — Household Card Sharing

**Caveats:**

- Card sharing is **explicit opt-in per card** — never default-visible to household
- The Phase A deeplink mechanism remains intact; household sharing is a separate "share to household" action
- Household-visible cards are stored server-side (Supabase) with RLS scoped to household membership
- A card removed from household visibility must disappear from all members' views promptly (within next sync cycle)

### 14-6 — Household Shopping List Sync

**Caveats:**

- Phase A SQLite schema must be forward-compatible with the cloud model (UUID keys, timestamps)
- Simultaneous edits (two members add/remove at the same time) must resolve deterministically — last-write-wins on item level is acceptable for MVP
- Offline edits queue locally and sync on reconnect; no merge conflict UI needed for MVP
- A member leaving the household retains their locally-ticked items but loses access to future shared updates

---

## Prerequisite Gates (Before Any Phase A Implementation)

| Gate                                                                   | Status                    |
| ---------------------------------------------------------------------- | ------------------------- |
| Sprint 13 watch reliability work closed and stable                     | Required                  |
| Cloud sync (Supabase) proven stable at single-user scale in production | Required                  |
| Sprint 13 internationalisation complete                                | Required                  |
| `myloyaltycards://` deeplink scheme verified end-to-end on device      | Must validate before 14-2 |

---

## Revised Epic 14 Story Map

| Story | Title                                     | Phase            | Account Required |
| ----- | ----------------------------------------- | ---------------- | ---------------- |
| 14-1  | Epic scoping & discovery (this story)     | Planning         | No               |
| 14-2  | Card sharing via deeplink                 | A — Single user  | No               |
| 14-3  | Shopping list — single user               | A — Single user  | No               |
| 14-4  | Household membership                      | B — Household    | Yes              |
| 14-5a | Household cards UX design _(blocks 14-5)_ | B — Design spike | Yes              |
| 14-5  | Household card sharing                    | B — Household    | Yes              |
| 14-6  | Household shopping list sync              | B — Household    | Yes              |

---

## Acceptance Criteria

- AC1 — Team has reviewed and aligned on the Phase A / Phase B split and story map above.
- AC2 — PRD updated to reflect the revised Epic 14 scope (Phase A + Phase B; bills explicitly descoped).
- AC3 — Sprint backlog contains Epic 14 with stories 14-2 through 14-6 estimated and prioritised.
- AC4 — All Phase A caveats (deeplink design, SQLite schema, migration path) captured and assigned to stories.
- AC5 — All Phase B caveats (privacy rules, household ownership, invite token, GDPR) captured and assigned to stories.
- AC6 — Deeplink HTTPS fallback decision recorded: silent failure accepted; "Copy card code" plain-text fallback included in share sheet.

## Tasks

- [x] Align team on Phase A / Phase B split and confirm bills descoping. _(confirmed by Ifero, 2026-06-05)_
- [x] Update PRD Phase 2 section to reflect revised Epic 14 scope. _(updated 2026-06-05)_
- [x] Create story files 14-2 through 14-6 with detailed acceptance criteria. _(created 2026-06-05)_
- [ ] Validate `myloyaltycards://` deeplink routing on a real device. _(moved to story 14-2 as a prerequisite task)_
- [x] Decision: HTTPS fallback — silent failure accepted; plain-text "Copy card code" fallback in share sheet.
- [x] Decision: Household ownership transfer — two-prompt flow (nominate successor + shared card disposition); personal cards deleted with account; no per-card prompting.
- [x] Decision: Household max members capped at 6 (owner + 5), enforced server-side.

## Notes

Bill splitting is out of scope for Epic 14. Local mode terminology is canonical — "guest" is deprecated.
Phase A stories (14-2, 14-3) can begin after Sprint 13 gates are met, independently of Phase B.
