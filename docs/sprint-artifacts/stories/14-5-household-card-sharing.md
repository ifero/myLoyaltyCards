# Story 14.5: Household Card Sharing

## Story Information

| Field          | Value                                                                                   |
| -------------- | --------------------------------------------------------------------------------------- |
| **Story ID**   | 14-5                                                                                    |
| **Epic**       | 14 - Household Collaboration                                                            |
| **Sprint**     | TBD (Phase B)                                                                           |
| **Status**     | Backlog                                                                                 |
| **Priority**   | Medium                                                                                  |
| **Estimate**   | 5 points                                                                                |
| **Owners**     | PM: Ifero · Dev: — · QA: —                                                              |
| **Depends on** | 14-4 (household membership), 14-5a (household cards UX design — must be approved first) |

---

## Story

As a household member,
I want to share a loyalty card with my household,
so that other members can use it when they shop.

## Context

This is a Phase B story — a cloud account and household membership are required.

Card sharing to a household is separate from the P2P deeplink sharing introduced in story 14-2. The two mechanisms coexist:

- **14-2 deeplink**: P2P share to a specific person; creates a copy of the card on their device
- **14-5 household visibility**: makes the card visible to all household members; no copy is created; the card belongs to the sharer

**Visibility model:**

- Card sharing is **explicit opt-in per card** — cards are private by default
- Only the card owner can share their card to the household
- A member cannot share another member's card
- A household-visible card is shown to all current members; it disappears when unshared or when the owner leaves the household
- Personal cards are never exposed to the household without the owner's explicit action

## Database Schema (Supabase)

```sql
CREATE TABLE household_card_visibility (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  card_id         TEXT NOT NULL,                              -- local card UUID from the owner's device
  owner_user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (household_id, card_id)
);
```

**RLS policies:**

- Readable by any member of the household (join via `household_members`)
- Insertable and deletable only by the `owner_user_id` (card owner)
- On member departure (`household_members` DELETE), cascade removes their visibility rows via trigger or application logic

## Acceptance Criteria

- AC1 — A "Visible to household" toggle is shown on the card detail screen for signed-in users who are household members.
- AC2 — The toggle is not shown in local mode or when the user has no household.
- AC3 — Enabling the toggle immediately marks the card as household-visible; no additional confirmation modal.
- AC4 — Disabling the toggle immediately removes the card from household visibility.
- AC5 — Household members can see shared cards in a dedicated "Household cards" section or tab, distinct from their own cards.
- AC6 — A household-visible card shows the owner's name or avatar as a badge so members know whose card it is.
- AC7 — A member cannot toggle the visibility of a card that belongs to another member.
- AC8 — When a member who shared cards leaves the household, their shared cards are removed from the household view for all remaining members.
- AC9 — Household card changes (share, unshare, member departure) are reflected without requiring a manual refresh (within the sync cycle).
- AC10 — Cards shared to the household are not duplicated on members' devices — they are rendered from the owner's card data.

## Technical Notes

- Household cards are fetched via a Supabase query joining `household_card_visibility` → owner's card data. Card data must be accessible to household members: consider a `shared_cards` view or a minimal card snapshot stored server-side alongside the visibility row (name, barcodeValue, barcodeFormat, brandId, color)
- Storing a snapshot alongside the visibility row is preferred over querying across user data — it avoids cross-user RLS complexity
- Snapshot schema (stored in `household_card_visibility` or a companion table): `name`, `barcode_value`, `barcode_format`, `brand_id`, `color` — updated when the owner edits the card
- Realtime: subscribe to `household_card_visibility` changes for the user's household on app foreground
- The "Household cards" section should be visually distinct but use the same card component as the personal card list

## Tasks

- [ ] Apply Supabase migration: `household_card_visibility` table with snapshot columns and RLS policies
- [ ] Add "Visible to household" toggle to card detail screen (hidden in local mode / no household)
- [ ] Implement household card repository: share, unshare, fetch household cards
- [ ] Create "Household cards" section in the card list or a dedicated tab
- [ ] Add owner badge/attribution to household card display
- [ ] Subscribe to Realtime channel for household card visibility changes
- [ ] Handle member departure: remove visibility rows for departed member
- [ ] Write unit tests: share/unshare logic, non-owner toggle guard, departure cascade
- [ ] Write integration tests: visibility reflected across members, Realtime update
