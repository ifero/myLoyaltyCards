# Story 14.4: Household Membership

## Story Information

| Field          | Value                                        |
| -------------- | -------------------------------------------- |
| **Story ID**   | 14-4                                         |
| **Epic**       | 14 - Household Collaboration                 |
| **Sprint**     | TBD (Phase B)                                |
| **Status**     | Backlog                                      |
| **Priority**   | Medium                                       |
| **Estimate**   | 8 points                                     |
| **Owners**     | PM: Ifero · Dev: — · QA: —                   |
| **Depends on** | Cloud account (Supabase auth must be active) |

---

## Story

As a signed-in user,
I want to create or join a household,
so that I can share cards and shopping lists with the people I live with.

## Context

This is a Phase B story — a cloud account is required. Local-mode users see an upgrade prompt instead of household entry points.

A household is a named group of up to 6 members (owner + 5). Members are invited via a short-lived token. The owner has full control; members can view shared content and leave.

**Membership model:**

- Roles: `owner` | `member` (no guest tier in MVP)
- Max members: **6** (enforced server-side)
- Invite token: opaque, stored in `household_invites` table, expires after **48 hours**, single-use

**Owner account deletion flow (two prompts):**

1. **Nominate a successor** — mandatory; owner cannot delete account if they are the sole owner of a household with other members. They must nominate a member to become the new owner, or dissolve the household.
2. **Shared card disposition** — one binary choice: transfer household-visible cards to the nominee, or remove them from the household. Personal cards are deleted with the account (no prompt, GDPR-clean).

If the household has no other members, account deletion dissolves the household silently — no prompts.

## Database Schema (Supabase)

```sql
-- Households
CREATE TABLE households (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Membership
CREATE TABLE household_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id)
);

-- Invite tokens
CREATE TABLE household_invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE,
  created_by    UUID NOT NULL REFERENCES auth.users(id),
  expires_at    TIMESTAMPTZ NOT NULL,
  used          BOOLEAN NOT NULL DEFAULT false
);
```

**RLS policies:**

- `households`: readable by any member of the household (join via `household_members`)
- `household_members`: readable by any member of the same household
- `household_invites`: creatable by household owner only; readable by anyone who has the token (for join validation)
- Max-member cap enforced via server-side check in the join Edge Function (not RLS)

## Acceptance Criteria

- AC1 — Household entry points (create / join) are not shown in local mode; a "Create an account to use household features" prompt is shown instead.
- AC2 — A signed-in user can create a household with a name; they become the owner.
- AC3 — The owner can generate an invite link; the link contains the invite token and is shareable via the native share sheet.
- AC4 — Invite tokens expire after 48 hours; an expired token shows an "Invite link expired" error.
- AC5 — A used token cannot be reused; a second join attempt with the same token shows an error.
- AC6 — Joining a household that already has 6 members shows a "Household is full" error.
- AC7 — A member can leave a household; their membership row is deleted. Other members are not affected.
- AC8 — The household screen shows the list of current members with their roles.
- AC9 — When an owner initiates account deletion and the household has other members: prompt 1 (nominate successor) blocks deletion until a member is selected. Prompt 2 (shared card disposition — transfer or remove) must be completed before deletion proceeds.
- AC10 — If the owner's household has no other members, account deletion dissolves the household silently with no additional prompts.
- AC11 — All household operations (create, invite, join, leave) are reflected in the UI without requiring a manual refresh.

## Technical Notes

- Invite token generation: use a cryptographically random opaque string (e.g. 32-byte hex via `crypto.getRandomValues`) — do **not** use sequential or guessable IDs
- Token validation and membership creation: Supabase Edge Function (`household-join`) — validates token, checks member cap, inserts membership row atomically
- Max-member enforcement: checked in the Edge Function before inserting into `household_members`, not only client-side
- Deep link for invite: `myloyaltycards://household/join?token=<token>` — must handle cold-start (same pattern as story 14-2)
- Entry point in the app: settings screen or a dedicated "Household" tab (UX to confirm placement)

## Tasks

- [ ] Apply Supabase migration: `households`, `household_members`, `household_invites` tables with RLS policies
- [ ] Create `household-join` Edge Function (token validation, cap check, membership insert)
- [ ] Create household screens: create household, household detail (members list), join via token
- [ ] Add household entry point in app navigation (local-mode upgrade prompt)
- [ ] Implement invite link generation and share sheet
- [ ] Implement cold-start deeplink handling for `myloyaltycards://household/join`
- [ ] Implement owner account deletion flow: nominate successor + shared card disposition prompts
- [ ] Write unit tests for token generation, expiry, and reuse rejection
- [ ] Write integration tests for member cap enforcement and join Edge Function
