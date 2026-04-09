import { renderHook, act } from '@testing-library/react-native';

import { useExportData } from './useExportData';

const mockGetCardCount = jest.fn();
const mockGetAllCards = jest.fn();
const mockCreateFile = jest.fn();
const mockWriteFile = jest.fn();
const mockIsAvailableAsync = jest.fn();
const mockShareAsync = jest.fn();
const mockToast = jest.fn();

jest.mock('@/core/database/card-repository', () => ({
  getCardCount: () => mockGetCardCount(),
  getAllCards: () => mockGetAllCards()
}));

jest.mock('expo-file-system', () => ({
  Paths: { document: 'file:///documents/' },
  File: class MockFile {
    uri: string;

    constructor(_base: string, name: string) {
      this.uri = `file:///documents/${name}`;
    }

    create() {
      mockCreateFile();
    }

    write(content: string) {
      mockWriteFile(content);
    }
  }
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: () => mockIsAvailableAsync(),
  shareAsync: (...args: unknown[]) => mockShareAsync(...args)
}));

jest.mock('expo-constants', () => ({
  expoConfig: { version: '1.4.0' }
}));

jest.mock('burnt', () => ({
  toast: (...args: unknown[]) => mockToast(...args)
}));

describe('useExportData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCardCount.mockResolvedValue(2);
    mockGetAllCards.mockResolvedValue([
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Store 1',
        barcode: '111',
        barcodeFormat: 'QR',
        brandId: null,
        color: 'blue',
        isFavorite: false,
        lastUsedAt: null,
        usageCount: 0,
        createdAt: '2026-04-07T09:00:00.000Z',
        updatedAt: '2026-04-07T09:00:00.000Z'
      }
    ]);
    mockIsAvailableAsync.mockResolvedValue(true);
    mockShareAsync.mockResolvedValue(undefined);
  });

  it('loads card count and exports JSON', async () => {
    const { result } = renderHook(() => useExportData());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.cardCount).toBe(2);

    await act(async () => {
      await result.current.exportCards();
    });

    expect(mockCreateFile).toHaveBeenCalled();
    expect(mockWriteFile).toHaveBeenCalled();
    expect(mockShareAsync).toHaveBeenCalled();
    expect(JSON.parse(mockWriteFile.mock.calls[0][0])).toMatchObject({
      version: '2.0',
      cardCount: 1,
      cards: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Store 1',
          barcode: '111',
          barcodeFormat: 'QR',
          brandId: null,
          color: 'blue'
        }
      ]
    });
    expect(mockToast).toHaveBeenCalledWith({ title: 'Export complete', preset: 'done' });
  });

  it('keeps the backup locally when sharing fails', async () => {
    mockShareAsync.mockRejectedValueOnce(new Error('Share sheet unavailable'));

    const { result } = renderHook(() => useExportData());

    await act(async () => {
      await result.current.exportCards();
    });

    expect(result.current.exportError).toBeNull();
    expect(mockCreateFile).toHaveBeenCalled();
    expect(mockWriteFile).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Export complete',
      message: 'Backup saved locally in Files. Sharing is unavailable in this environment.',
      preset: 'done'
    });
  });

  it('falls back to a local backup when sharing is unavailable', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);

    const { result } = renderHook(() => useExportData());

    await act(async () => {
      await result.current.exportCards();
    });

    expect(result.current.exportError).toBeNull();
    expect(mockShareAsync).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Export complete',
      message: 'Backup saved locally in Files. Sharing is unavailable in this environment.',
      preset: 'done'
    });
  });
});
