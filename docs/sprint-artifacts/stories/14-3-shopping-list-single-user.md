# Story 14.3: Shopping List — Single User

## Story Information

| Field          | Value                                |
| -------------- | ------------------------------------ |
| **Story ID**   | 14-3                                 |
| **Epic**       | 14 - Household Collaboration         |
| **Sprint**     | TBD (Phase A)                        |
| **Status**     | Backlog                              |
| **Priority**   | High                                 |
| **Estimate**   | 3 points                             |
| **Owners**     | PM: Ifero · Dev: — · QA: —           |
| **Depends on** | None (Phase A — no account required) |

---

## Story

As a user,
I want a simple shopping list I can add items to and tick off,
so that I can plan my shopping alongside my loyalty cards in one app.

## Context

This is a Phase A story — single-user, fully local, no account required. The list persists in SQLite on-device and survives app restarts.

In Phase B (story 14-6), this list gains household sync. The schema defined here must be forward-compatible with cloud sync without a destructive migration.

**Interaction model:**

- Add item at the top of the list (text input + add button)
- Tap item to toggle ticked/unticked
- Swipe to delete
- No categories, multi-list, notes, or sorting controls in MVP
- Duplicate item names are allowed (it's a list, not a set)

## Schema

```sql
CREATE TABLE shopping_list_items (
  id          TEXT PRIMARY KEY,           -- UUID v4
  name        TEXT NOT NULL,
  ticked      INTEGER NOT NULL DEFAULT 0, -- boolean
  position    INTEGER NOT NULL,           -- display order (lower = higher in list)
  created_at  TEXT NOT NULL,              -- ISO 8601
  updated_at  TEXT NOT NULL,              -- ISO 8601
  synced_at   TEXT,                       -- nullable; set when synced to cloud in Phase B
  household_id TEXT                       -- nullable; unused in Phase A, foreign key in Phase B
);
```

- UUID primary keys ensure cloud-mergeability in Phase B
- `household_id` column added now (nullable) to avoid a structural migration later
- `position` is insertion order — new items get `position = 0`, existing items shift down

## Acceptance Criteria

- AC1 — A shopping list screen is accessible from the main app navigation.
- AC2 — The screen shows an input field and an "Add" button at the top, and the list of items below.
- AC3 — Adding an item prepends it to the top of the list.
- AC4 — Tapping an item toggles its ticked state. Ticked items show a visual strikethrough or check state.
- AC5 — Swiping an item left reveals a delete action. Confirming removes the item.
- AC6 — The list persists across app restarts.
- AC7 — Empty state: when no items exist, a friendly empty state message is shown (no blank screen).
- AC8 — Item name is limited to 100 characters; input does not allow exceeding this limit.
- AC9 — The feature works in local mode (no account) and cloud mode.
- AC10 — When a local-mode user upgrades to a cloud account, shopping list items are migrated using the existing guest-migration pattern in `core/auth/guest-migration.ts`.

## Technical Notes

- Store in `expo-sqlite` (already a project dependency)
- Repository: `core/shopping-list/shopping-list-repository.ts` (new)
- Schema migration must be applied via the existing SQLite migration system in the project
- `id`: `uuidv4()` (already available via `uuid` + `react-native-get-random-values` polyfill — import order must be respected per project convention)
- Ticked items stay visible in the list (do not auto-clear) — user deletes them explicitly
- Watch app: **out of scope** for Phase A

## Tasks

- [ ] Add `shopping_list_items` table migration to the SQLite migration system
- [ ] Create `core/shopping-list/shopping-list-repository.ts` with CRUD operations
- [ ] Create shopping list screen with add/tick/delete interactions
- [ ] Add shopping list entry point to app navigation
- [ ] Implement empty state UI
- [ ] Add guest-migration support for shopping list items in `core/auth/guest-migration.ts`
- [ ] Write unit tests for repository (add, tick, delete, persistence)
- [ ] Write component tests for empty state, add, tick, and delete interactions
