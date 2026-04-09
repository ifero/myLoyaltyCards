import type { LoyaltyCard } from '@/core/schemas';

import { analyzeImportPayload, createExportPayload, importAnalyzedCards } from './importCards';

const mockBatchUpsertCards = jest.fn();
const mockGetAllCards = jest.fn();
const mockMarkDirty = jest.fn();

jest.mock('@/core/database/card-repository', () => ({
  batchUpsertCards: (...args: unknown[]) => mockBatchUpsertCards(...args),
  getAllCards: (...args: unknown[]) => mockGetAllCards(...args)
}));

jest.mock('@/core/sync', () => ({
  markDirty: (...args: unknown[]) => mockMarkDirty(...args)
}));

describe('importCards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllCards.mockResolvedValue([
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Existing',
        barcode: '12345',
        barcodeFormat: 'EAN13',
        brandId: 'brand-a',
        color: 'blue',
        isFavorite: false,
        lastUsedAt: null,
        usageCount: 0,
        createdAt: '2026-04-01T10:00:00.000Z',
        updatedAt: '2026-04-01T10:00:00.000Z'
      }
    ]);
  });

  it('creates a roundtrip export payload', () => {
    const payload = createExportPayload(
      [
        {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Roundtrip',
          barcode: '99887',
          barcodeFormat: 'CODE128',
          brandId: null,
          color: 'grey',
          isFavorite: true,
          lastUsedAt: null,
          usageCount: 1,
          createdAt: '2026-04-07T09:00:00.000Z',
          updatedAt: '2026-04-07T09:00:00.000Z'
        }
      ],
      '1.4.0'
    );

    expect(payload.version).toBe('2.0');
    expect(payload.cardCount).toBe(1);
    expect(payload.cards).toHaveLength(1);
    expect(payload.cards[0]?.brandId).toBeNull();
  });

  it('returns invalid when JSON is malformed', async () => {
    await expect(analyzeImportPayload('{bad json', 'broken.json')).resolves.toEqual({
      status: 'invalid',
      title: 'Invalid File',
      message: "This file doesn't contain valid card data. Please select a different file."
    });

    expect(mockBatchUpsertCards).not.toHaveBeenCalled();
    expect(mockMarkDirty).not.toHaveBeenCalled();
  });

  it('returns empty when cards array is empty', async () => {
    await expect(
      analyzeImportPayload(
        JSON.stringify({
          version: '2.0',
          appVersion: '1.4.0',
          exportDate: '2026-04-09T10:00:00.000Z',
          cardCount: 0,
          cards: []
        }),
        'empty.json'
      )
    ).resolves.toEqual({
      status: 'empty',
      title: 'No Card Data',
      message: 'This file contains no card data.'
    });

    expect(mockBatchUpsertCards).not.toHaveBeenCalled();
    expect(mockMarkDirty).not.toHaveBeenCalled();
  });

  it('fails integrity check when cardCount does not match', async () => {
    const result = await analyzeImportPayload(
      JSON.stringify({
        version: '2.0',
        appVersion: '1.4.0',
        exportDate: '2026-04-09T10:00:00.000Z',
        cardCount: 2,
        cards: [
          {
            id: '22222222-2222-4222-8222-222222222222',
            name: 'Only One',
            barcode: '99887',
            barcodeFormat: 'CODE128',
            brandId: null,
            color: 'grey',
            isFavorite: false,
            lastUsedAt: null,
            usageCount: 0,
            createdAt: '2026-04-07T09:00:00.000Z',
            updatedAt: '2026-04-07T09:00:00.000Z'
          }
        ]
      }),
      'mismatch.json'
    );

    expect(result.status).toBe('invalid');
  });

  it('builds a preview with duplicates and invalid entries counted', async () => {
    const result = await analyzeImportPayload(
      JSON.stringify({
        version: '2.0',
        appVersion: '1.4.0',
        exportDate: '2026-04-09T10:00:00.000Z',
        cardCount: 4,
        cards: [
          {
            id: '22222222-2222-4222-8222-222222222222',
            name: 'Existing Duplicate',
            barcode: '12345',
            barcodeFormat: 'EAN13',
            brandId: 'brand-a',
            color: 'blue',
            isFavorite: false,
            lastUsedAt: null,
            usageCount: 0,
            createdAt: '2026-04-07T09:00:00.000Z',
            updatedAt: '2026-04-07T09:00:00.000Z'
          },
          {
            id: '33333333-3333-4333-8333-333333333333',
            name: 'Fresh Card',
            barcode: '77777',
            barcodeFormat: 'CODE128',
            brandId: null,
            color: 'green',
            isFavorite: true,
            lastUsedAt: null,
            usageCount: 2,
            createdAt: '2026-04-07T09:00:00.000Z',
            updatedAt: '2026-04-07T09:00:00.000Z'
          },
          {
            storeName: 'Legacy Card',
            cardNumber: '88888',
            barcodeFormat: 'QR_CODE',
            color: 'orange',
            createdAt: '2026-04-07T09:00:00.000Z'
          },
          {
            nope: true
          }
        ]
      }),
      'mixed.json'
    );

    expect(result.status).toBe('preview');

    if (result.status === 'preview') {
      expect(result.preview.newCardsCount).toBe(2);
      expect(result.preview.duplicateCount).toBe(1);
      expect(result.preview.invalidCount).toBe(1);
    }
  });

  it('counts duplicates that appear inside the same imported file', async () => {
    const result = await analyzeImportPayload(
      JSON.stringify({
        version: '2.0',
        appVersion: '1.4.0',
        exportDate: '2026-04-09T10:00:00.000Z',
        cardCount: 2,
        cards: [
          {
            id: '55555555-5555-4555-8555-555555555555',
            name: 'First Copy',
            barcode: '12121',
            barcodeFormat: 'QR',
            brandId: null,
            color: 'grey',
            isFavorite: false,
            lastUsedAt: null,
            usageCount: 0,
            createdAt: '2026-04-07T09:00:00.000Z',
            updatedAt: '2026-04-07T09:00:00.000Z'
          },
          {
            id: '66666666-6666-4666-8666-666666666666',
            name: 'Second Copy',
            barcode: '12121',
            barcodeFormat: 'QR',
            brandId: null,
            color: 'red',
            isFavorite: false,
            lastUsedAt: null,
            usageCount: 0,
            createdAt: '2026-04-07T09:00:00.000Z',
            updatedAt: '2026-04-07T09:00:00.000Z'
          }
        ]
      }),
      'duplicates.json',
      []
    );

    expect(result.status).toBe('preview');

    if (result.status === 'preview') {
      expect(result.preview.newCardsCount).toBe(1);
      expect(result.preview.duplicateCount).toBe(1);
    }
  });

  it('supports a full roundtrip from export payload to import commit', async () => {
    const cards: LoyaltyCard[] = [
      {
        id: '77777777-7777-4777-8777-777777777777',
        name: 'Roundtrip Card',
        barcode: '91919',
        barcodeFormat: 'CODE128',
        brandId: 'brand-z',
        color: 'orange',
        isFavorite: true,
        lastUsedAt: '2026-04-08T11:30:00.000Z',
        usageCount: 7,
        createdAt: '2026-04-07T09:00:00.000Z',
        updatedAt: '2026-04-08T11:30:00.000Z'
      }
    ];
    const payload = createExportPayload(cards, '1.4.0');
    const analysis = await analyzeImportPayload(JSON.stringify(payload), 'roundtrip.json', []);

    expect(analysis.status).toBe('preview');

    if (analysis.status === 'preview') {
      const commitResult = await importAnalyzedCards(analysis.preview);

      expect(mockBatchUpsertCards).toHaveBeenCalledWith(cards);
      expect(commitResult).toEqual({
        importedCount: 1,
        duplicateCount: 0,
        invalidCount: 0
      });
    }
  });

  it('returns preview with zero importable cards when file contains only duplicates', async () => {
    const result = await analyzeImportPayload(
      JSON.stringify({
        version: '2.0',
        appVersion: '1.4.0',
        exportDate: '2026-04-09T10:00:00.000Z',
        cardCount: 1,
        cards: [
          {
            id: '88888888-8888-4888-8888-888888888888',
            name: 'Already There',
            barcode: '12345',
            barcodeFormat: 'EAN13',
            brandId: 'brand-a',
            color: 'blue',
            isFavorite: false,
            lastUsedAt: null,
            usageCount: 0,
            createdAt: '2026-04-07T09:00:00.000Z',
            updatedAt: '2026-04-07T09:00:00.000Z'
          }
        ]
      }),
      'only-duplicates.json'
    );

    expect(result.status).toBe('preview');

    if (result.status === 'preview') {
      expect(result.preview.newCardsCount).toBe(0);
      expect(result.preview.duplicateCount).toBe(1);
      await expect(importAnalyzedCards(result.preview)).resolves.toEqual({
        importedCount: 0,
        duplicateCount: 1,
        invalidCount: 0
      });
      expect(mockBatchUpsertCards).not.toHaveBeenCalled();
      expect(mockMarkDirty).not.toHaveBeenCalled();
    }
  });

  it('imports analyzed cards and marks sync dirty only when there are new cards', async () => {
    const result = await analyzeImportPayload(
      JSON.stringify({
        version: '2.0',
        appVersion: '1.4.0',
        exportDate: '2026-04-09T10:00:00.000Z',
        cardCount: 1,
        cards: [
          {
            id: '44444444-4444-4444-8444-444444444444',
            name: 'Import Me',
            barcode: '55555',
            barcodeFormat: 'CODE39',
            brandId: null,
            color: 'red',
            isFavorite: false,
            lastUsedAt: null,
            usageCount: 0,
            createdAt: '2026-04-07T09:00:00.000Z',
            updatedAt: '2026-04-07T09:00:00.000Z'
          }
        ]
      }),
      'import.json'
    );

    expect(result.status).toBe('preview');

    if (result.status === 'preview') {
      const commitResult = await importAnalyzedCards(result.preview);

      expect(mockBatchUpsertCards).toHaveBeenCalledWith(result.preview.importableCards);
      expect(mockMarkDirty).toHaveBeenCalled();
      expect(commitResult.importedCount).toBe(1);
    }
  });
});
