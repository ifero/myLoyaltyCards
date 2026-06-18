/**
 * Core Schemas Module
 * Story 1.3: Create Core Data Schema
 *
 * This module exports all Zod schemas and provides utilities
 * for safe parsing with error logging.
 */

import * as z from 'zod';

// Aliased to avoid shadowing the injectable `logger` parameter of parseWithLogging.
import { logger as appLogger } from '@/core/utils/logger';

// Re-export all card-related schemas and types
export {
  loyaltyCardSchema,
  barcodeFormatSchema,
  cardColorSchema,
  CARD_COLOR_KEYS,
  type LoyaltyCard,
  type BarcodeFormat,
  type CardColor,
  type LoyaltyCardInput
} from './card';

/**
 * Logger interface for parseWithLogging
 * Allows dependency injection for testing and different logging backends
 */
interface Logger {
  error: (message: string, meta?: Record<string, unknown>) => void;
}

/**
 * Default logger — delegates to the app logging wrapper, which routes errors
 * to Sentry in production builds (Story 16.2).
 */
const defaultLogger: Logger = {
  error: (message: string, meta?: Record<string, unknown>) => {
    appLogger.error(message, meta);
  }
};

/**
 * Safe parsing utility with error logging
 *
 * Always use this function for parsing cross-platform data to catch
 * schema mismatches early. Logs detailed error information for debugging.
 *
 * @param schema - Zod schema to validate against
 * @param data - Unknown data to parse
 * @param context - Description of where parsing is happening (for error logs)
 * @param logger - Optional custom logger (defaults to console)
 * @returns Parsed data if valid, null if invalid
 *
 * @example
 * ```ts
 * const card = parseWithLogging(loyaltyCardSchema, jsonData, 'sync:cards');
 * if (card) {
 *   // card is fully typed as LoyaltyCard
 *   renderCard(card.name);
 * }
 * ```
 */
export function parseWithLogging<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string,
  logger: Logger = defaultLogger
): T | null {
  const result = schema.safeParse(data);

  if (!result.success) {
    logger.error(`Schema validation failed: ${context}`, {
      errors: result.error.issues,
      data: JSON.stringify(data).slice(0, 500)
    });
    return null;
  }

  return result.data;
}
