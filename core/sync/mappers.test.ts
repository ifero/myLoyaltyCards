import { LoyaltyCard } from '@/core/schemas';

import { localCardToCloudRow } from './mappers';

const makeCard = (overrides: Partial<LoyaltyCard> = {}): LoyaltyCard => ({
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Store 1',
  barcode: '1234567890',
  barcodeFormat: 'EAN13',
  brandId: null,
  color: 'blue',
  isFavorite: true,
  lastUsedAt: null,
  usageCount: 2,
  createdAt: '2026-03-21T10:30:00.123Z',
  updatedAt: '2026-03-21T10:30:00.123Z',
  ...overrides
});

describe('localCardToCloudRow', () => {
  it('maps all fields from camelCase to snake_case', () => {
    const card = makeCard();

    const row = localCardToCloudRow(card, '22222222-2222-4222-8222-222222222222');

    expect(row).toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      user_id: '22222222-2222-4222-8222-222222222222',
      name: 'Store 1',
      barcode: '1234567890',
      barcode_format: 'EAN13',
      brand_id: null,
      color: 'blue',
      is_favorite: true,
      last_used_at: null,
      usage_count: 2,
      created_at: '2026-03-21T10:30:00.123Z',
      updated_at: '2026-03-21T10:30:00.123Z'
    });
  });

  it('preserves null brand and last used fields', () => {
    const row = localCardToCloudRow(
      makeCard({
        brandId: null,
        lastUsedAt: null
      }),
      '22222222-2222-4222-8222-222222222222'
    );

    expect(row.brand_id).toBeNull();
    expect(row.last_used_at).toBeNull();
  });

  it('maps boolean favorite value', () => {
    const favorite = localCardToCloudRow(
      makeCard({ isFavorite: true }),
      '22222222-2222-4222-8222-222222222222'
    );
    const notFavorite = localCardToCloudRow(
      makeCard({ isFavorite: false }),
      '22222222-2222-4222-8222-222222222222'
    );

    expect(favorite.is_favorite).toBe(true);
    expect(notFavorite.is_favorite).toBe(false);
  });
});
