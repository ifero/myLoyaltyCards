/**
 * Catalogue Types
 * Story 3.1: Create Italian Catalogue Data
 *
 * Types for the static brand catalogue.
 */

import { z } from 'zod';

import { barcodeFormatSchema } from '@/core/schemas/card';

export const catalogueBrandSchema = z.object({
  /** Unique stable ID (e.g. "esselunga") */
  id: z.string(),
  /** Display name */
  name: z.string(),
  /** Alternative names for search indexing */
  aliases: z.array(z.string()),
  /** Asset key for logo mapping */
  logo: z.string(),
  /** Brand primary color (HEX) */
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'),
  /** Default barcode format if known */
  defaultFormat: barcodeFormatSchema.optional()
});

export const catalogueDataSchema = z.object({
  /** ISO Date version string: YYYY-MM-DD */
  version: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid ISO date'),
  /** List of brands */
  brands: z.array(catalogueBrandSchema)
});

export type CatalogueBrand = z.infer<typeof catalogueBrandSchema>;
export type CatalogueData = z.infer<typeof catalogueDataSchema>;
