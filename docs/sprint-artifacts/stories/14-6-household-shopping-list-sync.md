# Story 14.6: Household Shopping List Sync

## Story Information

| Field          | Value                                                    |
| -------------- | -------------------------------------------------------- |
| **Story ID**   | 14-6                                                     |
| **Epic**       | 14 - Household Collaboration                             |
| **Sprint**     | TBD (Phase B)                                            |
| **Status**     | Backlog                                                  |
| **Priority**   | Medium                                                   |
| **Estimate**   | 5 points                                                 |
| **Owners**     | PM: Ifero · Dev: — · QA: —                               |
| **Depends on** | 14-3 (shopping list schema), 14-4 (household membership) |

---

## Story

As a household member,
I want my shopping list to sync with my household,
so that anyone in the household can add, tick, or remove items and we all see the same list.

## Context

This is a Phase B story. It extends the single-user shopping list from story 14-3 by connecting it to the household. The SQLite schema defined in 14-3 (UUID keys, `household_id` nullable column, `updated_at` timestamps) is forward-compatible with this story — no destructive migration is needed.

**Sync strategy:**

- Sync mechanism: Supabase Realtime channel per household + polling on app foreground
- Conflict resolution: **last-write-wins on item level** using `updated_at` — acceptable for a shopping list
- Offline edits: queue in SQLite with a `pending_sync` boolean flag; flush on reconnect
- A member who leaves the household retains their locally-ticked state but loses access to future shared updates

## Database Schema (Supabase)

```sql
CREATE TABLE household_shopping_list_items (
  id              UUID PRIMARY KEY,           -- same UUID as local SQLite id (from 14-3)
  household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  ticked          BOOLEAN NOT NULL DEFAULT false,
  position        INTEGER NOT NULL,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  updated_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**RLS policies:**

- Readable and writable by any current member of the household (join via `household_members`)
- On household deletion, cascade removes all items

**Sync flow:**

1. User adds/edits/deletes/ticks item locally → SQLite updated → item marked `pending_sync = true`
2. App attempts immediate sync to Supabase
3. If offline: item stays in SQLite with `pending_sync = true`; synced on next app foreground or reconnect
4. On sync: write to `household_shopping_list_items`; clear `pending_sync`
5. On Realtime event (other member's change): update local SQLite record if `updated_at` is newer

## Acceptance Criteria

- AC1 — When a household member adds an item to their shopping list, it appears on all other members' lists within the sync cycle.
- AC2 — When a member ticks an item, the ticked state is reflected for all other members within the sync cycle.
- AC3 — When a member deletes an item, it is removed from all members' lists within the sync cycle.
- AC4 — Offline: a member can add, tick, and delete items while offline; changes are queued locally and synced when connectivity is restored.
- AC5 — Concurrent offline edits: if two members add items offline and both sync, both items appear on all members' lists (duplicates are acceptable — no data is lost).
- AC6 — Concurrent tick conflict: last-write-wins on `updated_at` — no error is shown to the user.
- AC7 — A member who leaves the household retains their local list state but no longer receives or sends sync updates.
- AC8 — A member who is removed from a household (future: owner removes member) loses sync access without the app crashing or showing an error loop.
- AC9 — The sync status is transparent: a subtle indicator shows when items are pending sync (e.g. a small "syncing" badge), cleared when sync completes.
- AC10 — The feature degrades gracefully for local-mode users: they continue to see their personal shopping list unaffected (household sync simply does not activate).

## Technical Notes

- `pending_sync` column must be added to the local `shopping_list_items` SQLite table via a migration (additive, non-breaking)
- The `household_id` nullable column from story 14-3 is populated when the user joins a household — a migration updates existing rows if the user already has items
- Realtime subscription: subscribe to `household_shopping_list_items` for the user's `household_id` on app foreground; unsubscribe on background
- Sync service: `core/shopping-list/shopping-list-sync-service.ts` (new) — handles push (local → cloud) and pull (Realtime events → local)
- Do not merge local personal items (no `household_id`) into the household cloud list automatically — only items the user explicitly has while a household member are synced
- Watch app: **out of scope** for Phase B (deferred to Epic 15 or a dedicated watch story)

## Tasks

- [ ] Add `pending_sync` column migration to local SQLite `shopping_list_items` table
- [ ] Apply Supabase migration: `household_shopping_list_items` table with RLS policies
- [ ] Create `core/shopping-list/shopping-list-sync-service.ts`: push on write, flush pending on reconnect, pull on Realtime event
- [ ] Subscribe to Supabase Realtime channel on household join / app foreground; unsubscribe on leave / background
- [ ] Populate `household_id` on local items when user joins a household
- [ ] Clear household sync on member departure (unsubscribe, clear `household_id` from local items)
- [ ] Add pending sync indicator UI to shopping list screen
- [ ] Write unit tests: offline queue, last-write-wins merge, departure cleanup
- [ ] Write integration tests: two-member sync, concurrent offline edits, reconnect flush
