const mockFrom = jest.fn();

jest.mock('./client', () => ({
  getSupabaseClient: () => ({
    from: mockFrom
  })
}));

import { CloudCardRow } from '@/core/sync';

import { upsertCards, fetchCards } from './cards';

const makeCloudRow = (id: string): CloudCardRow => ({
  id,
  user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Store',
  barcode: '123',
  barcode_format: 'EAN13',
  brand_id: null,
  color: 'blue',
  is_favorite: false,
  last_used_at: null,
  usage_count: 0,
  created_at: '2026-03-21T10:30:00.123Z',
  updated_at: '2026-03-21T10:30:00.123Z'
});

describe('upsertCards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls Supabase upsert on loyalty_cards with onConflict id', async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert });

    const rows = [makeCloudRow('11111111-1111-4111-8111-111111111111')];
    const result = await upsertCards(rows);

    expect(mockFrom).toHaveBeenCalledWith('loyalty_cards');
    expect(upsert).toHaveBeenCalledWith(rows, { onConflict: 'id' });
    expect(result).toEqual({ error: null });
  });

  it('returns normalized error message when Supabase fails', async () => {
    const upsert = jest.fn().mockResolvedValue({ error: { message: 'boom' } });
    mockFrom.mockReturnValue({ upsert });

    const result = await upsertCards([makeCloudRow('11111111-1111-4111-8111-111111111111')]);

    expect(result).toEqual({ error: 'boom' });
  });

  it('returns validation error and skips upsert when row schema is invalid', async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert });

    const result = await upsertCards([makeCloudRow('invalid-id')]);

    expect(result).toEqual({ error: 'Validation failed for 1 card(s) before cloud upload.' });
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe('fetchCards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls Supabase select with user_id filter', async () => {
    const eq = jest.fn().mockResolvedValue({
      data: [makeCloudRow('11111111-1111-4111-8111-111111111111')],
      error: null
    });
    const select = jest.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ select });

    const result = await fetchCards('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

    expect(mockFrom).toHaveBeenCalledWith('loyalty_cards');
    expect(select).toHaveBeenCalledWith('*');
    expect(eq).toHaveBeenCalledWith('user_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(result.data).toHaveLength(1);
    expect(result.error).toBeNull();
  });

  it('returns empty array when no cards exist', async () => {
    const eq = jest.fn().mockResolvedValue({ data: [], error: null });
    const select = jest.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ select });

    const result = await fetchCards('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('returns empty array when data is null', async () => {
    const eq = jest.fn().mockResolvedValue({ data: null, error: null });
    const select = jest.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ select });

    const result = await fetchCards('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('returns normalized error message when Supabase fails', async () => {
    const eq = jest.fn().mockResolvedValue({ data: null, error: { message: 'DB down' } });
    const select = jest.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ select });

    const result = await fetchCards('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

    expect(result.data).toEqual([]);
    expect(result.error).toBe('DB down');
  });
});
