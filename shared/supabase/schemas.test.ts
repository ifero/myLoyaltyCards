/**
 * Cloud Database Schemas — Unit Tests
 * Story 6-2: Define Cloud Schema & Row-Level Security
 *
 * Validates that Zod schemas enforce the constraint documented in
 * docs/schemas/README.md and the Postgres migration 002.
 *
 * Tests follow the project pattern: pure Zod validation tests —
 * no network calls, no Supabase client.
 */

import {
  cloudLoyaltyCardSchema,
  cloudUserSchema,
  cloudUserInsertSchema,
  cloudPrivacyLogSchema,
  cloudPrivacyLogInsertSchema,
  privacyEventTypeSchema,
  cloudBarcodeFormatSchema,
  cloudCardColorSchema,
  isoDatetimeSchema
} from './schemas';

// ============================================================
// Helpers
// ============================================================

const NOW = '2026-03-01T10:00:00.000Z';
// Must be valid RFC 4122 UUIDs (version 1-8, variant 8-b) for Zod v4 strict UUID validation
const UUID_A = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5';
const UUID_B = 'b2c3d4e5-f6a7-4b8c-9d0e-f1a2b3c4d5e6';

function validCloudCard(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID_A,
    user_id: UUID_B,
    name: 'Esselunga',
    barcode: '1234567890',
    barcode_format: 'EAN13',
    brand_id: null,
    color: 'blue',
    is_favorite: false,
    last_used_at: null,
    usage_count: 0,
    created_at: NOW,
    updated_at: NOW,
    ...overrides
  };
}

function validCloudUser(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID_A,
    email: 'user@example.com',
    consent_status: null,
    consented_at: null,
    created_at: NOW,
    ...overrides
  };
}

/** Omit one key from a plain object — avoids unused-var lint issues */
function omitKey<T extends Record<string, unknown>>(obj: T, key: keyof T): Omit<T, typeof key> {
  const result = { ...obj } as Record<string, unknown>;
  delete result[key as string];
  return result as Omit<T, typeof key>;
}

function validPrivacyLog(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID_A,
    user_id: UUID_B,
    event_type: 'login',
    event_time: NOW,
    ...overrides
  };
}

// ============================================================
// isoDatetimeSchema
// ============================================================

describe('isoDatetimeSchema', () => {
  it('accepts valid ISO 8601 UTC datetime', () => {
    expect(isoDatetimeSchema.safeParse(NOW).success).toBe(true);
  });

  it('accepts ISO 8601 with offset', () => {
    expect(isoDatetimeSchema.safeParse('2026-03-01T10:00:00.000+01:00').success).toBe(true);
  });

  it('rejects plain date string', () => {
    expect(isoDatetimeSchema.safeParse('2026-03-01').success).toBe(false);
  });

  it('rejects non-datetime strings', () => {
    expect(isoDatetimeSchema.safeParse('not-a-date').success).toBe(false);
  });
});

// ============================================================
// cloudBarcodeFormatSchema
// ============================================================

describe('cloudBarcodeFormatSchema', () => {
  const validFormats = ['CODE128', 'EAN13', 'EAN8', 'QR', 'CODE39', 'UPCA'] as const;

  it.each(validFormats)('accepts valid format: %s', (format) => {
    expect(cloudBarcodeFormatSchema.safeParse(format).success).toBe(true);
  });

  it('rejects unknown format', () => {
    expect(cloudBarcodeFormatSchema.safeParse('PDF417').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(cloudBarcodeFormatSchema.safeParse('').success).toBe(false);
  });
});

// ============================================================
// cloudCardColorSchema
// ============================================================

describe('cloudCardColorSchema', () => {
  const validColors = ['blue', 'red', 'green', 'orange', 'grey'] as const;

  it.each(validColors)('accepts valid color: %s', (color) => {
    expect(cloudCardColorSchema.safeParse(color).success).toBe(true);
  });

  it('rejects unknown color', () => {
    expect(cloudCardColorSchema.safeParse('purple').success).toBe(false);
  });
});

// ============================================================
// privacyEventTypeSchema
// ============================================================

describe('privacyEventTypeSchema', () => {
  const validEvents = [
    'login',
    'registration',
    'consent_given',
    'consent_withdrawn',
    'data_export',
    'account_deletion'
  ] as const;

  it.each(validEvents)('accepts valid event type: %s', (type) => {
    expect(privacyEventTypeSchema.safeParse(type).success).toBe(true);
  });

  it('rejects unknown event type', () => {
    expect(privacyEventTypeSchema.safeParse('password_change').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(privacyEventTypeSchema.safeParse('').success).toBe(false);
  });
});

// ============================================================
// cloudLoyaltyCardSchema
// ============================================================

describe('cloudLoyaltyCardSchema', () => {
  it('accepts a fully valid cloud card', () => {
    const result = cloudLoyaltyCardSchema.safeParse(validCloudCard());
    expect(result.success).toBe(true);
  });

  it('accepts a card with brand_id set', () => {
    const result = cloudLoyaltyCardSchema.safeParse(validCloudCard({ brand_id: 'esselunga' }));
    expect(result.success).toBe(true);
  });

  it('accepts card where last_used_at is a valid ISO datetime', () => {
    const result = cloudLoyaltyCardSchema.safeParse(validCloudCard({ last_used_at: NOW }));
    expect(result.success).toBe(true);
  });

  it('accepts card where is_favorite is true', () => {
    const result = cloudLoyaltyCardSchema.safeParse(validCloudCard({ is_favorite: true }));
    expect(result.success).toBe(true);
  });

  it('accepts all valid barcode formats', () => {
    const formats = ['CODE128', 'EAN13', 'EAN8', 'QR', 'CODE39', 'UPCA'];
    for (const format of formats) {
      const result = cloudLoyaltyCardSchema.safeParse(validCloudCard({ barcode_format: format }));
      expect(result.success).toBe(true);
    }
  });

  it('rejects card without user_id', () => {
    const card = omitKey(validCloudCard(), 'user_id');
    const result = cloudLoyaltyCardSchema.safeParse(card);
    expect(result.success).toBe(false);
  });

  it('rejects card with invalid user_id (not a UUID)', () => {
    const result = cloudLoyaltyCardSchema.safeParse(validCloudCard({ user_id: 'not-a-uuid' }));
    expect(result.success).toBe(false);
  });

  it('rejects card with unknown barcode_format', () => {
    const result = cloudLoyaltyCardSchema.safeParse(validCloudCard({ barcode_format: 'PDF417' }));
    expect(result.success).toBe(false);
  });

  it('rejects card with unknown color', () => {
    const result = cloudLoyaltyCardSchema.safeParse(validCloudCard({ color: 'purple' }));
    expect(result.success).toBe(false);
  });

  it('rejects card with name exceeding 50 characters', () => {
    const result = cloudLoyaltyCardSchema.safeParse(validCloudCard({ name: 'A'.repeat(51) }));
    expect(result.success).toBe(false);
  });

  it('rejects card with negative usage_count', () => {
    const result = cloudLoyaltyCardSchema.safeParse(validCloudCard({ usage_count: -1 }));
    expect(result.success).toBe(false);
  });

  it('rejects card with invalid created_at', () => {
    const result = cloudLoyaltyCardSchema.safeParse(validCloudCard({ created_at: '2026-03-01' }));
    expect(result.success).toBe(false);
  });

  it('rejects card with non-ISO last_used_at', () => {
    const result = cloudLoyaltyCardSchema.safeParse(validCloudCard({ last_used_at: 'yesterday' }));
    expect(result.success).toBe(false);
  });

  it('infers correct TypeScript type structure', () => {
    const result = cloudLoyaltyCardSchema.safeParse(validCloudCard());
    if (result.success) {
      // Type assertions — if these compile, types are correct
      const card = result.data;
      const _id: string = card.id;
      const _userId: string = card.user_id;
      const _isFav: boolean = card.is_favorite;
      const _usageCount: number = card.usage_count;
      expect(_id).toBeDefined();
      expect(_userId).toBeDefined();
      expect(_isFav).toBe(false);
      expect(_usageCount).toBe(0);
    }
  });
});

// ============================================================
// cloudUserSchema
// ============================================================

describe('cloudUserSchema', () => {
  it('accepts a valid user with consent_status null', () => {
    const result = cloudUserSchema.safeParse(validCloudUser());
    expect(result.success).toBe(true);
  });

  it('accepts a user who gave consent', () => {
    const result = cloudUserSchema.safeParse(
      validCloudUser({ consent_status: true, consented_at: NOW })
    );
    expect(result.success).toBe(true);
  });

  it('accepts a user who withdrew consent', () => {
    const result = cloudUserSchema.safeParse(
      validCloudUser({ consent_status: false, consented_at: null })
    );
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = cloudUserSchema.safeParse(validCloudUser({ email: 'not-an-email' }));
    expect(result.success).toBe(false);
  });

  it('rejects empty email', () => {
    const result = cloudUserSchema.safeParse(validCloudUser({ email: '' }));
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID for id', () => {
    const result = cloudUserSchema.safeParse(validCloudUser({ id: 'bad-id' }));
    expect(result.success).toBe(false);
  });

  it('rejects invalid ISO 8601 for created_at', () => {
    const result = cloudUserSchema.safeParse(validCloudUser({ created_at: '01/03/2026' }));
    expect(result.success).toBe(false);
  });

  it('rejects non-ISO consented_at', () => {
    const result = cloudUserSchema.safeParse(
      validCloudUser({ consent_status: true, consented_at: 'today' })
    );
    expect(result.success).toBe(false);
  });
});

// ============================================================
// cloudUserInsertSchema (omits created_at)
// ============================================================

describe('cloudUserInsertSchema', () => {
  it('accepts valid insert payload without created_at', () => {
    const payload = omitKey(validCloudUser(), 'created_at');
    const result = cloudUserInsertSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('accepts created_at as an additional field (ignored by Zod strip)', () => {
    // Zod strips unknown keys by default; ensure extra field does not cause failure
    const result = cloudUserInsertSchema.safeParse(validCloudUser());
    expect(result.success).toBe(true);
  });

  it('rejects payload with invalid email', () => {
    const payload = omitKey(validCloudUser({ email: 'bad' }), 'created_at');
    const result = cloudUserInsertSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

// ============================================================
// cloudPrivacyLogSchema
// ============================================================

describe('cloudPrivacyLogSchema', () => {
  it('accepts a valid privacy log entry', () => {
    const result = cloudPrivacyLogSchema.safeParse(validPrivacyLog());
    expect(result.success).toBe(true);
  });

  it.each([
    'login',
    'registration',
    'consent_given',
    'consent_withdrawn',
    'data_export',
    'account_deletion'
  ])('accepts valid event_type: %s', (eventType) => {
    const result = cloudPrivacyLogSchema.safeParse(validPrivacyLog({ event_type: eventType }));
    expect(result.success).toBe(true);
  });

  it('rejects unknown event_type', () => {
    const result = cloudPrivacyLogSchema.safeParse(
      validPrivacyLog({ event_type: 'profile_update' })
    );
    expect(result.success).toBe(false);
  });

  it('rejects entry without user_id', () => {
    const entry = omitKey(validPrivacyLog(), 'user_id');
    const result = cloudPrivacyLogSchema.safeParse(entry);
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID user_id', () => {
    const result = cloudPrivacyLogSchema.safeParse(validPrivacyLog({ user_id: 'bad' }));
    expect(result.success).toBe(false);
  });

  it('rejects non-ISO event_time', () => {
    const result = cloudPrivacyLogSchema.safeParse(
      validPrivacyLog({ event_time: '1st March 2026' })
    );
    expect(result.success).toBe(false);
  });
});

// ============================================================
// cloudPrivacyLogInsertSchema (omits id)
// ============================================================

describe('cloudPrivacyLogInsertSchema', () => {
  it('accepts valid insert payload without id', () => {
    const payload = omitKey(validPrivacyLog(), 'id');
    const result = cloudPrivacyLogInsertSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('rejects insert payload with invalid event_type', () => {
    const payload = omitKey(validPrivacyLog({ event_type: 'bad_event' }), 'id');
    const result = cloudPrivacyLogInsertSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects insert payload with non-ISO event_time', () => {
    const payload = omitKey(validPrivacyLog({ event_time: 'now' }), 'id');
    const result = cloudPrivacyLogInsertSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});
