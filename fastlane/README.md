# Store Credentials & Fastlane Match Setup

This guide explains how to set up all required secrets and Fastlane Match for both Google Play Store (Android) and App Store Connect (iOS) for CI/CD.

---

## 1. iOS (App Store Connect)

### Required Secrets (GitHub Actions)

- `MATCH_PASSWORD`: Password for the encrypted certificates repo (used by Fastlane Match)
- `APP_STORE_CONNECT_API_KEY`: JSON key for App Store Connect API (for Fastlane upload)
- `FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD`: (if needed for App Store upload)
- `FASTLANE_SESSION`: (optional, for 2FA bypass)

### Fastlane Match Setup

1. Create a private repo for certificates (e.g., `my-org/certificates`).
2. Run on your local machine:
   ```sh
   fastlane match init
   fastlane match appstore --readonly # For App Store
   fastlane match adhoc --readonly    # For AdHoc builds
   ```
3. Set the `MATCH_PASSWORD` secret in GitHub Actions to the password you used.
4. Grant your CI user access to the certificates repo.
5. Generate an App Store Connect API key:
   - Go to App Store Connect > Users and Access > Keys
   - Create a new API key (App Manager role)
   - Download the JSON and set as `APP_STORE_CONNECT_API_KEY` secret

---

## 2. Android (Google Play Console)

### Required Secrets (GitHub Actions)

- `PLAY_STORE_API_KEY`: JSON key for Google Play API access (Service Account)
- `MATCH_PASSWORD`: (if using Fastlane Match for Android Keystore)

### Play Console Setup

1. Create a Google Cloud Service Account with access to Play Console API.
2. Grant the Service Account "Release Manager" or "Editor" role in Play Console.
3. Download the JSON key and set as `PLAY_STORE_API_KEY` secret in GitHub Actions.
4. (Optional) Use Fastlane Supply for Play Store uploads.

---

## 3. Fastlane Environment Variables

- All secrets must be set in GitHub Actions as repository or environment secrets.
- Fastlane will automatically pick up these variables during CI runs.

---

## 4. References

- [Fastlane Match Docs](https://docs.fastlane.tools/actions/match/)
- [App Store Connect API Key](https://docs.fastlane.tools/app-store-connect-api/)
- [Google Play API Setup](https://docs.fastlane.tools/actions/supply/)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

---

## 5. Troubleshooting

- If builds fail due to code signing, check the `MATCH_PASSWORD` and repo access.
- For Play Store upload errors, verify the Service Account permissions and API key.
- For App Store upload errors, check API key validity and Fastlane session status.

---

## 6. Updating Certificates/Keys

- Rotate certificates/keys regularly and update secrets in GitHub Actions.
- Re-run `fastlane match` locally to update provisioning profiles/certificates as needed.

---

## 7. Example: Setting a Secret in GitHub Actions

1. Go to your repo > Settings > Secrets and variables > Actions
2. Click "New repository secret"
3. Name: `MATCH_PASSWORD` Value: your-password
4. Repeat for all required secrets above
