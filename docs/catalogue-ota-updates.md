# Catalogue OTA Updates (EAS Update)

This project ships the catalogue as a bundled JSON asset (`catalogue/italy.json`).
New catalogue versions are delivered via EAS Update (Expo Updates) as OTA JS bundle updates.

## Prerequisites

- EAS Update is configured for the project (run `eas update:configure`).
- `expo-updates` is installed in the app.
- `updates.url` and `runtimeVersion` are set in app config (see EAS Update docs).

## Update Procedure

1. Update `catalogue/italy.json` (add brands, update `version`).
2. Commit changes to the repo.
3. Publish an OTA update:
   - `eas update --branch <branch> --message "Catalogue update: <version>"`
4. Launch the app to receive the update.

## Verification Checklist

- Confirm the new brand appears in the catalogue grid.
- Open Settings and check the displayed `Catalogue Version` matches the JSON.

## Notes

- Catalogue updates are bundled with JS updates, so no runtime fetch is required.
- Keep `version` as an ISO date (`YYYY-MM-DD`) for deterministic comparisons.
