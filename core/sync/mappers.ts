import {
  type BarcodeFormat,
  type CardColor,
  type LoyaltyCard,
  loyaltyCardSchema,
  parseWithLogging
} from '@/core/schemas';

export type CloudCardRow = {
  id: string;
  user_id: string;
  name: string;
  barcode: string;
  barcode_format: string;
  brand_id: string | null;
  color: string;
  is_favorite: boolean;
  last_used_at: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
};

export const localCardToCloudRow = (card: LoyaltyCard, userId: string): CloudCardRow => {
  return {
    id: card.id,
    user_id: userId,
    name: card.name,
    barcode: card.barcode,
    barcode_format: card.barcodeFormat,
    brand_id: card.brandId,
    color: card.color,
    is_favorite: card.isFavorite,
    last_used_at: card.lastUsedAt,
    usage_count: card.usageCount,
    created_at: card.createdAt,
    updated_at: card.updatedAt
  };
};

/**
 * Map a cloud row (snake_case) to a local LoyaltyCard (camelCase).
 * Strips user_id. Returns null if Zod validation fails.
 */
export const cloudRowToLocalCard = (row: CloudCardRow): LoyaltyCard | null => {
  const mapped = {
    id: row.id,
    name: row.name,
    barcode: row.barcode,
    barcodeFormat: row.barcode_format as BarcodeFormat,
    brandId: row.brand_id,
    color: row.color as CardColor,
    isFavorite: row.is_favorite,
    lastUsedAt: row.last_used_at,
    usageCount: row.usage_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };

  return parseWithLogging(loyaltyCardSchema, mapped, 'sync:cloudRowToLocalCard');
};
