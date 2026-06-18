/**
 * Consent Logger
 * Story 6-4: Privacy Policy & Consent Flow
 *
 * Logs consent events (given / withdrawn) to the Supabase `privacy_log`
 * table for GDPR audit purposes.
 *
 * This module lives in `core/privacy/` — it uses dependency injection for
 * the Supabase insert function so it doesn't import from `shared/` and
 * respects the layer boundary (core → core | catalogue only).
 *
 * Behaviour:
 * - No-op when `userId` is null/empty (guest mode — nothing to log)
 * - Never throws — failures are logged via logger.error (Sentry in prod) but never propagated.
 */

import { logger } from '@/core/utils/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Consent-related event types (subset of PrivacyEventType) */
export type ConsentEventType = 'consent_given' | 'consent_withdrawn';

/** Minimal interface for inserting a row into privacy_log */
export type PrivacyLogInsertFn = (row: {
  user_id: string;
  event_type: ConsentEventType;
  event_time: string;
}) => Promise<{ error: unknown }>;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Insert a consent event into the `privacy_log` table.
 *
 * @param userId   - The authenticated user's UUID, or `null` for guest mode.
 * @param eventType - `'consent_given'` or `'consent_withdrawn'`.
 * @param insertFn  - Injected insert function (from Supabase client).
 */
export const logConsentEvent = async (
  userId: string | null,
  eventType: ConsentEventType,
  insertFn: PrivacyLogInsertFn
): Promise<void> => {
  // Guest mode — nothing to audit in the cloud
  if (!userId) return;

  try {
    const { error } = await insertFn({
      user_id: userId,
      event_type: eventType,
      event_time: new Date().toISOString()
    });

    if (error) {
      // GDPR audit-write failures must stay observable in production, so use
      // logger.error, which always logs and routes to Sentry in prod.
      // eventType is not PII; the Sentry payload is scrubbed before transmit.
      logger.error('[consent-logger] Failed to log event:', eventType, error);
    }
  } catch (err) {
    // Offline / transient failures must not crash the consent flow, but the
    // audit gap must still be reported in production (see above).
    logger.error('[consent-logger] Network error logging event:', eventType, err);
  }
};
