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
  Paths: { cache: 'file:///cache/' },
  File: class MockFile {
    uri: string;

    constructor(_base: string, name: string) {
      this.uri = `file:///cache/${name}`;
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
  __esModule: true,
  default: {
    toast: (...args: unknown[]) => mockToast(...args)
  }
}));

describe('useExportData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCardCount.mockResolvedValue(2);
    mockGetAllCards.mockResolvedValue([
      {
        name: 'Store 1',
        barcode: '111',
        barcodeFormat: 'QR_CODE',
        color: 'blue',
        createdAt: '2026-04-07T09:00:00.000Z'
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
    expect(mockToast).toHaveBeenCalledWith({ title: 'Export complete', preset: 'done' });
  });

  it('returns error state if sharing unavailable', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);

    const { result } = renderHook(() => useExportData());

    await act(async () => {
      await result.current.exportCards();
    });

    expect(result.current.exportError).toBe('Sharing is not available on this device');
  });
});
