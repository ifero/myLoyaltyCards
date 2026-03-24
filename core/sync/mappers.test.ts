import { LoyaltyCard } from '@/core/schemas';

import { CloudCardRow, cloudRowToLocalCard, localCardToCloudRow } from './mappers';

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

const makeCloudRow = (overrides: Partial<CloudCardRow> = {}): CloudCardRow => ({
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
  updated_at: '2026-03-21T10:30:00.123Z',
  ...overrides
});

describe('cloudRowToLocalCard', () => {
  it('maps all 12 fields from snake_case to camelCase', () => {
    const row = makeCloudRow();

    const card = cloudRowToLocalCard(row);

    expect(card).toEqual({
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
      updatedAt: '2026-03-21T10:30:00.123Z'
    });
  });

  it('strips user_id from the output', () => {
    const card = cloudRowToLocalCard(makeCloudRow());

    expect(card).not.toBeNull();
    expect(card).not.toHaveProperty('user_id');
    expect(card).not.toHaveProperty('userId');
  });

  it('preserves null brandId and lastUsedAt', () => {
    const card = cloudRowToLocalCard(makeCloudRow({ brand_id: null, last_used_at: null }));

    expect(card?.brandId).toBeNull();
    expect(card?.lastUsedAt).toBeNull();
  });

  it('maps non-null brandId and lastUsedAt', () => {
    const card = cloudRowToLocalCard(
      makeCloudRow({
        brand_id: 'esselunga',
        last_used_at: '2026-03-22T08:00:00.000Z'
      })
    );

    expect(card?.brandId).toBe('esselunga');
    expect(card?.lastUsedAt).toBe('2026-03-22T08:00:00.000Z');
  });

  it('maps is_favorite boolean correctly', () => {
    const fav = cloudRowToLocalCard(makeCloudRow({ is_favorite: true }));
    const notFav = cloudRowToLocalCard(makeCloudRow({ is_favorite: false }));

    expect(fav?.isFavorite).toBe(true);
    expect(notFav?.isFavorite).toBe(false);
  });

  it('returns null for invalid row (bad UUID)', () => {
    const card = cloudRowToLocalCard(makeCloudRow({ id: 'invalid-id' }));

    expect(card).toBeNull();
  });

  it('returns null for invalid barcode_format', () => {
    const card = cloudRowToLocalCard(makeCloudRow({ barcode_format: 'INVALID' }));

    expect(card).toBeNull();
  });

  it('returns null for invalid color', () => {
    const card = cloudRowToLocalCard(makeCloudRow({ color: 'pink' }));

    expect(card).toBeNull();
  });
});
