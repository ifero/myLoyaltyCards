/**
 * Cloud Database Schemas (Supabase)
 * Story 6-2: Define Cloud Schema & Row-Level Security
 *
 * These schemas mirror the Supabase Postgres tables.
 * Key differences from the local SQLite schemas in core/schemas/:
 *   - All tables include user_id (multi-tenant cloud)
 *   - Columns use snake_case to match DB naming conventions
 *   - timestamps are ISO 8601 strings (consistent with local schema)
 *
 * Mapping reference:
 *   DB column        → TS/Zod field
 *   snake_case       → camelCase  (transformation done at API boundary)
 *
 * These schemas serve two purposes:
 *   1. Runtime validation when reading data from Supabase
 *   2. Type source-of-truth for cloud ↔ local sync mappers
 */

import { z } from 'zod';

// ============================================================
// Shared primitives
// ============================================================

/** ISO 8601 datetime string — used for all timestamp columns */
export const isoDatetimeSchema = z.string().datetime({ offset: true });

/** UUID string */
export const uuidSchema = z.string().uuid();

// ============================================================
// loyalty_cards (cloud row — includes user_id)
// ============================================================

/**
 * Supported barcode formats stored in the cloud.
 * Must stay in sync with core/schemas/card.ts barcodeFormatSchema.
 */
export const cloudBarcodeFormatSchema = z.enum([
  'CODE128',
  'EAN13',
  'EAN8',
  'QR',
  'CODE39',
  'UPCA'
]);

/**
 * Supported card colors stored in the cloud.
 * Must stay in sync with core/schemas/card.ts cardColorSchema.
 */
export const cloudCardColorSchema = z.enum(['blue', 'red', 'green', 'orange', 'grey']);

/**
 * Cloud loyalty card row — includes user_id for multi-tenant ownership.
 * Fields use snake_case to match the Postgres column names.
 */
export const cloudLoyaltyCardSchema = z.object({
  /** Client-generated UUID — PK */
  id: uuidSchema,

  /** Owner — FK to auth.users */
  user_id: uuidSchema,

  /** Display name (max 50 chars) */
  name: z.string().max(50),

  /** Raw barcode value */
  barcode: z.string(),

  /** Barcode symbology */
  barcode_format: cloudBarcodeFormatSchema,

  /** Optional catalogue brand reference */
  brand_id: z.string().nullable(),

  /** Virtual logo background colour */
  color: cloudCardColorSchema,

  /** Pinned/favourite flag */
  is_favorite: z.boolean(),

  /** ISO 8601 — last time card was displayed; null if never */
  last_used_at: isoDatetimeSchema.nullable(),

  /** Number of display sessions */
  usage_count: z.number().int().nonnegative(),

  /** ISO 8601 — row creation time */
  created_at: isoDatetimeSchema,

  /** ISO 8601 — row last-modified time */
  updated_at: isoDatetimeSchema
});

export type CloudLoyaltyCard = z.infer<typeof cloudLoyaltyCardSchema>;

// ============================================================
// users (public profile table)
// ============================================================

/**
 * Valid values for privacy_log.event_type.
 * Kept in sync with the DB CHECK constraint (comment in migration).
 */
export const privacyEventTypeSchema = z.enum([
  'login',
  'registration',
  'consent_given',
  'consent_withdrawn',
  'data_export',
  'account_deletion'
]);

export type PrivacyEventType = z.infer<typeof privacyEventTypeSchema>;

/**
 * Cloud users profile row.
 * One profile per auth.users row, created immediately after sign-up.
 */
export const cloudUserSchema = z.object({
  /** UUID — same as auth.users.id (PK + FK) */
  id: uuidSchema,

  /** Unique email address */
  email: z.string().email(),

  /**
   * Whether the user has granted GDPR/privacy consent.
   * null means consent has not yet been requested (legacy row or pre-consent).
   */
  consent_status: z.boolean().nullable(),

  /**
   * ISO 8601 — when consent was last given.
   * null when consent_status is false/null.
   */
  consented_at: isoDatetimeSchema.nullable(),

  /** ISO 8601 — row creation time */
  created_at: isoDatetimeSchema
});

export type CloudUser = z.infer<typeof cloudUserSchema>;

/**
 * Shape of the object used to create a new user profile (omit auto-set fields).
 */
export const cloudUserInsertSchema = cloudUserSchema.omit({ created_at: true });
export type CloudUserInsert = z.infer<typeof cloudUserInsertSchema>;

// ============================================================
// privacy_log (append-only audit trail)
// ============================================================

/**
 * Cloud privacy log row.
 * Immutable — rows are never updated or deleted directly (CASCADE handles cleanup).
 */
export const cloudPrivacyLogSchema = z.object({
  /** Server-generated UUID — PK */
  id: uuidSchema,

  /** Owner — FK to auth.users */
  user_id: uuidSchema,

  /** Category of the privacy event */
  event_type: privacyEventTypeSchema,

  /** ISO 8601 — when the event occurred */
  event_time: isoDatetimeSchema
});

export type CloudPrivacyLog = z.infer<typeof cloudPrivacyLogSchema>;

/**
 * Shape of the object used to insert a new privacy log entry.
 * The server generates `id`; client provides user_id, event_type, event_time.
 */
export const cloudPrivacyLogInsertSchema = cloudPrivacyLogSchema.omit({ id: true });
export type CloudPrivacyLogInsert = z.infer<typeof cloudPrivacyLogInsertSchema>;
