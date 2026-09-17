/**
 * Loyalty Card Schema
 * Story 1.3: Create Core Data Schema
 *
 * This file contains the Zod schema for loyalty card data.
 * It serves as the single source of truth for data structures
 * across all platforms (phone, watch, cloud).
 */

import * as z from 'zod';

/**
 * Barcode format enum - supported barcode types
 * Matches cross-platform serialization (Swift/Kotlin use same string values)
 */
export const barcodeFormatSchema = z.enum(['CODE128', 'EAN13', 'EAN8', 'QR', 'CODE39', 'UPCA']);

/**
 * Card color keys - 5-color palette for Virtual Logo system.
 * Used when cards don't have official brand logos.
 * This is the canonical list - shared/theme imports from here.
 *
 * ⛔ FROZEN CONTRACT — THESE ARE IDENTIFIERS, NOT COLOUR NAMES (Story 21.2a, AC1).
 *
 * Do not add, remove or rename a key. `card.color` is persisted in SQLite and in
 * Supabase, written verbatim into user-held JSON backup files, and sent to BOTH
 * watches as `colorHex` (core/watch-connectivity.ts). Two of those four surfaces
 * are beyond any migration we can write:
 *
 *  - Backup files live on the user's device. `analyzeImportPayload` validates
 *    `color` with the schema below, and a card that fails is counted invalid and
 *    dropped with no message naming the cause — so a renamed key silently
 *    destroys every backup taken before the rename.
 *    (`cardColorSchema` guards the import and Supabase paths at runtime. The local
 *    SQLite read does not: `card-repository.ts` casts `row.color as CardColor`, so a
 *    stale key there mis-renders rather than being rejected — which makes the freeze
 *    argument stronger, not weaker.)
 *  - The Wear OS APK is an independently versioned, independently released
 *    artefact (watch-android/app/build.gradle.kts § versionCode bands). A watch
 *    that has not updated yet cannot resolve a renamed key and paints every card
 *    with the fallback accent, and `runtimeVersion.policy` is `appVersion`, so no
 *    OTA update can correct it.
 *
 * Story 21.2a therefore repainted the five VALUES onto the Cardì accents and left
 * the keys alone. Two are now deliberately misnamed: `orange` renders the beam
 * yellow #FCCC0C (orange is banned from the design system outright) and `grey`
 * renders the azure #0C84CC (there is no neutral among the five accents). The
 * user-facing labels are corrected in shared/i18n/locales/*, which is the only
 * place a key reaches a person.
 *
 * `core/wear-sync-contract.test.ts` pins this set against all three watch colour
 * maps and runs in the un-path-filtered quality gate.
 */
export const CARD_COLOR_KEYS = ['blue', 'red', 'green', 'orange', 'grey'] as const;

/**
 * Card color enum - derived from CARD_COLOR_KEYS
 */
export const cardColorSchema = z.enum(CARD_COLOR_KEYS);

/**
 * The accent a card falls back to when its colour cannot be resolved (Story 21.2a, AC4).
 *
 * Named rather than spelled `'grey'` at the call sites, because the key no longer
 * describes its colour: it resolves to the azure #0C84CC. Every runtime fallback on
 * the phone, plus `mapHexToCardColor`'s achromatic and invalid-input branches, routes
 * through this one constant, and Wear OS mirrors it as `DEFAULT_CARD_ACCENT`
 * (`CardVisuals.kt`) — so the phone and Wear OS agree on what an unresolvable colour
 * looks like.
 *
 * ⚠️ watchOS does NOT yet agree, and this constant does not reach it. `CardListView`
 * resolves `mapColor(hex:) ?? .gray`, so a card whose colour is absent or unreadable
 * gets SwiftUI's system grey rather than the azure. That is a pre-existing gap in the
 * same call site as the `isNearBlack` defect noted in Story 21.2a's record; both belong
 * to the watchOS fallback mechanism rather than to the palette, and neither is reached
 * while the phone emits one of the five keys — which it always does, because they are
 * frozen.
 *
 * Azure rather than one of the other four: none of the five accents is neutral, so
 * this is a design choice the story records rather than a substitution. Beam yellow
 * is the brand's signature and would make the fallback the loudest thing on screen;
 * red and green carry meaning; deep blue is the darkest. Azure is the quietest of
 * the five, and it keeps the same light/dark classification the retired `#64748B`
 * had, so no foreground decision changes.
 */
export const DEFAULT_CARD_COLOR: CardColor = 'grey';

/**
 * Loyalty Card Schema - Source of Truth
 *
 * All fields must be present in JSON (use null, never omit).
 * Dates are stored as ISO 8601 strings for cross-platform compatibility.
 * UUIDs are client-generated on all platforms.
 */
export const loyaltyCardSchema = z.object({
  /** Client-generated UUID */
  id: z.string().uuid(),

  /** Card display name (max 50 characters) */
  name: z.string().max(50),

  /** Barcode value/number */
  barcode: z.string(),

  /** Barcode format for rendering */
  barcodeFormat: barcodeFormatSchema,

  /** Reference to brand catalogue entry (null for custom cards) */
  brandId: z.string().nullable(),

  /** Card background color for Virtual Logo display */
  color: cardColorSchema,

  /** Whether card is pinned to top of list */
  isFavorite: z.boolean().default(false),

  /** Last time card was displayed (ISO 8601, null if never used) */
  lastUsedAt: z.string().datetime().nullable(),

  /** Number of times card has been displayed */
  usageCount: z.number().int().default(0),

  /** When card was created (ISO 8601) */
  createdAt: z.string().datetime(),

  /** When card was last modified (ISO 8601) */
  updatedAt: z.string().datetime()
});

/**
 * TypeScript type inferred from Zod schema
 * Use this type throughout the application for type safety
 */
export type LoyaltyCard = z.infer<typeof loyaltyCardSchema>;

/**
 * TypeScript type for barcode format
 */
export type BarcodeFormat = z.infer<typeof barcodeFormatSchema>;

/**
 * TypeScript type for card color
 */
export type CardColor = z.infer<typeof cardColorSchema>;

/**
 * Input type for creating a new card (before defaults are applied)
 */
export type LoyaltyCardInput = z.input<typeof loyaltyCardSchema>;
