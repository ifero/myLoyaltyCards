# Sprint 14 Retrospective — WatchOS Reliability, Italian In-App & Household Planning

**Date:** 2026-06-06
**Sprint:** 14 (2026-05-13 → 2026-05-26)
**Epics:** 2, 5, 6, 14, 15
**Status:** Complete
**Note:** Archived from `sprint-status.yaml` on 2026-06-11 when Sprint 15 rolled into `last_sprint` (single-slot). Preserved here so the history isn't lost.

---

## Delivery

10/10 stories done across 5 epics (14-1 updated to done post-sprint): 5-7, 5-8, 2-9, 2-10, 5-10, 15-2, 14-1, 6-18a, 11-7, 13-7b.

## What went well

- Strong throughput across a wide scope (Watch, localization, barcode, OTP, infra).
- Apple Watch epic (Epic 5) fully wrapped: 5-7, 5-8, and 5-10 all landed.
- Italian localization (15-2) shipped cleanly.
- Unplanned regression fix (13-7b, added 2026-06-04) absorbed without derailing the sprint.

## What could have gone better

- Story 5-7 (Watch Complication): agent started on deprecated ClockKit instead of current WidgetKit. Had to pivot mid-story, still ended up delivering a generic complication rather than the specific one intended. Rework loop caused significant frustration.

## Action items for Sprint 15

1. **Mandatory API currency check:** before any story touching Apple platform APIs (Watch, WidgetKit, PassKit, etc.), verify the current API via Context7 or official docs. Non-negotiable — goes in story acceptance criteria.
2. **Spike-first for Watch/native APIs:** no full implementation without a validated proof of concept on device first.
3. **Backlog a follow-up story in Epic 5** to replace the generic complication with the specific complication originally intended in 5-7.

---

> **Follow-through:** Action items 1 & 2 were applied in Epic 9 (Sprint 15) — the 9.6a spike/ADR before 9.6, and API-currency checks baked into 9.5/9.6 ACs (see [epic-9-retro-2026-06-10.md](epic-9-retro-2026-06-10.md)). Action item 3 (Epic 5 specific complication) remained unaddressed and was carried forward into the Epic 9 retro's action items.
