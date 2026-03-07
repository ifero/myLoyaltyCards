/**
 * Privacy Policy — Bundled Offline Content
 * Story 6-4: Privacy Policy & Consent Flow
 *
 * This module exports the privacy policy as a plain string so it can be
 * rendered without network access.  The content is displayed in
 * `features/privacy/PrivacyPolicyScreen.tsx`.
 *
 * When updating this policy, bump `PRIVACY_POLICY_VERSION` and update
 * `PRIVACY_POLICY_LAST_UPDATED`.
 */

/** Semantic version of the privacy policy document */
export const PRIVACY_POLICY_VERSION = '1.0.0';

/** ISO 8601 date of the last policy update */
export const PRIVACY_POLICY_LAST_UPDATED = '2026-03-06';

/**
 * Full privacy policy text.
 *
 * Structured sections:
 *  1. Introduction
 *  2. Data We Collect
 *  3. How We Use Your Data
 *  4. Data Storage & Security
 *  5. Data Sharing
 *  6. Your Rights (GDPR)
 *  7. Data Retention
 *  8. Children's Privacy
 *  9. Changes to This Policy
 * 10. Contact Us
 */
export const PRIVACY_POLICY_CONTENT = `Privacy Policy
Last updated: ${PRIVACY_POLICY_LAST_UPDATED}

1. Introduction

myLoyaltyCards ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains what data we collect, how we use it, and your rights under the General Data Protection Regulation (GDPR) and other applicable laws.

By using myLoyaltyCards you agree to the collection and use of information in accordance with this policy. You may use the app in guest mode without providing any personal data.

2. Data We Collect

When you use myLoyaltyCards without an account (guest mode), we do not collect or transmit any personal data. All card data is stored locally on your device.

When you create an account, we collect:
• Email address — used for authentication and account recovery.
• Loyalty card data — card names, barcode values, barcode formats, brand references, and usage metadata (favourite status, usage count, timestamps).
• Consent records — whether and when you accepted this Privacy Policy.

We do not collect:
• Location data
• Device identifiers or advertising IDs
• Analytics or tracking data
• Contacts, photos, or other sensitive device data

3. How We Use Your Data

We use your data exclusively for the following purposes:
• Authentication — to identify you and secure your account.
• Cloud backup — to store your loyalty cards so they sync across your devices.
• Audit trail — to record when you gave or withdrew consent (legal obligation under GDPR).

We do not use your data for advertising, profiling, or selling to third parties.

4. Data Storage & Security

• Local storage: Card data is stored on-device using an encrypted SQLite database. Session tokens are stored in the device Keychain (iOS) or Keystore (Android) via expo-secure-store.
• Cloud storage: If you create an account, your data is stored in Supabase (PostgreSQL) with Row-Level Security (RLS) ensuring only you can access your own data.
• Encryption: Data in transit is protected by TLS 1.2+. Data at rest in the cloud is encrypted by our hosting provider (AES-256).

5. Data Sharing

We do not share, sell, or rent your personal data to any third party. Your data is only processed by:
• Supabase — our cloud database and authentication provider (data processing agreement in place).

6. Your Rights (GDPR)

Under the GDPR, you have the following rights:
• Right of access — You can view all data we hold about you directly in the app.
• Right to rectification — You can edit your loyalty card data at any time.
• Right to erasure — You can delete your account and all cloud data from within the app. Deletion is completed within 30 days.
• Right to data portability — You can export your data in a standard format.
• Right to withdraw consent — You can revoke your consent at any time in Settings. Withdrawing consent does not affect the lawfulness of processing based on consent before its withdrawal.
• Right to restriction of processing — You can switch to guest mode at any time, which stops all cloud data processing.
• Right to lodge a complaint — You may file a complaint with your local data protection authority.

To exercise any of these rights, use the options in the app Settings or contact us at the address below.

7. Data Retention

• Guest mode: Data is stored only on your device. We retain nothing.
• Authenticated users: Your data is retained as long as your account is active. When you delete your account, all cloud data is permanently erased within 30 days.
• Consent logs: Kept for the duration required by applicable law (typically 3 years) for audit purposes, then permanently deleted.

8. Children's Privacy

myLoyaltyCards is not directed at children under 16 years of age. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us and we will delete it promptly.

9. Changes to This Policy

We may update this Privacy Policy from time to time. The updated version will be indicated by the "Last updated" date at the top. We encourage you to review this Privacy Policy periodically. Continued use of the app after changes constitutes acceptance of the updated policy.

10. Contact Us

If you have questions about this Privacy Policy or wish to exercise your rights, please contact us at:

Email: privacy@myloyaltycards.app
`;
