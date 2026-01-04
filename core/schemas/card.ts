/**
 * Loyalty Card Schema
 * Story 1.3: Create Core Data Schema
 *
 * This file contains the Zod schema for loyalty card data.
 * It serves as the single source of truth for data structures
 * across all platforms (phone, watch, cloud).
 */

import { z } from 'zod';

/**
 * Barcode format enum - supported barcode types
 * Matches cross-platform serialization (Swift/Kotlin use same string values)
 */
export const barcodeFormatSchema = z.enum([
  'CODE128',
  'EAN13',
  'EAN8',
  'QR',
  'CODE39',
  'UPCA',
]);

/**
 * Card color enum - 5-color palette for Virtual Logo system
 * Used when cards don't have official brand logos
 */
export const cardColorSchema = z.enum(['blue', 'red', 'green', 'orange', 'grey']);

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
  updatedAt: z.string().datetime(),
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
