# Story 3.5: Update Catalogue via OTA

**As a** user,
**I want** to receive new brands without updating the app,
**So that** my catalogue stays current.

## Acceptance Criteria

- [ ] **Updates**: The app checks for catalogue updates.
- [ ] **Mechanism**:
  - **Option A (Simpler)**: Use Expo Updates (EAS Update) to ship a new JS bundle containing the new `italy.json`.
  - **Option B (Dynamic)**: Fetch `latest-catalogue.json` from a remote endpoint (e.g., Supabase Storage/S3) on startup and cache it to filesystem.
  - _Decision_: **Option B** is more scalable for data-only updates, but **Option A** is native to Expo. Given FRs mention "OTA updates via Expo Updates", we proceed with **Option A**.
- [ ] **Verification**:
  - Modify `italy.json` (add a brand).
  - Publish branch update.
  - App downloads update.
  - New brand appears.

## Technical Notes

- **Expo Updates**: Since `italy.json` is imported into the JS bundle, standard `eas update` works out of the box.
- **Action**: This story is mostly about verifying the pipeline.
- **Versioning**: Ensure the `version` field in JSON is displayed in Settings > About to verify which catalogue version is active.

## Implementation Plan

1.  Add "Catalogue Version: {data.version}" to the Settings screen (Epic 8, but we can add a small text in Add Card footer for debug).
2.  (Ops Task) Document the process: "To update catalogue: Edit json -> Commit -> `eas update`".
3.  No major code changes needed if we stick to "Import JSON" strategy; this is purely infrastructure.
