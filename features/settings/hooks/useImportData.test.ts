import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useImportData } from './useImportData';

const mockGetDocumentAsync = jest.fn();
const mockFileText = jest.fn();
const mockAnalyzeImportPayload = jest.fn();
const mockImportAnalyzedCards = jest.fn();
const mockToast = jest.fn();

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: (...args: unknown[]) => mockGetDocumentAsync(...args)
}));

jest.mock('expo-file-system', () => ({
  File: class MockFile {
    constructor() {}

    text() {
      return mockFileText();
    }
  }
}));

jest.mock('@/core/settings/importCards', () => ({
  analyzeImportPayload: (...args: unknown[]) => mockAnalyzeImportPayload(...args),
  importAnalyzedCards: (...args: unknown[]) => mockImportAnalyzedCards(...args)
}));

jest.mock('burnt', () => ({
  toast: (...args: unknown[]) => mockToast(...args)
}));

describe('useImportData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing when the picker is canceled', async () => {
    mockGetDocumentAsync.mockResolvedValue({ canceled: true, assets: null });

    const { result } = renderHook(() => useImportData({ isAuthenticated: false }));

    await act(async () => {
      await result.current.pickImportFile();
    });

    expect(result.current.preview).toBeNull();
    expect(result.current.errorState).toBeNull();
    expect(mockAnalyzeImportPayload).not.toHaveBeenCalled();
  });

  it('surfaces invalid analysis results', async () => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///backup.json', name: 'backup.json' }]
    });
    mockFileText.mockResolvedValue('{"broken":true}');
    mockAnalyzeImportPayload.mockResolvedValue({
      status: 'invalid',
      title: 'Invalid File',
      message: "This file doesn't contain valid card data. Please select a different file."
    });

    const { result } = renderHook(() => useImportData({ isAuthenticated: false }));

    await act(async () => {
      await result.current.pickImportFile();
    });

    expect(result.current.errorState).toEqual({
      title: 'Invalid File',
      message: "This file doesn't contain valid card data. Please select a different file."
    });
  });

  it('triggers sync only for authenticated successful imports', async () => {
    const onImportSuccess = jest.fn().mockResolvedValue(undefined);
    const onSyncRequested = jest.fn().mockResolvedValue(undefined);

    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///backup.json', name: 'backup.json' }]
    });
    mockFileText.mockResolvedValue('{"ok":true}');
    mockAnalyzeImportPayload.mockResolvedValue({
      status: 'preview',
      preview: {
        fileName: 'backup.json',
        totalCards: 1,
        newCardsCount: 1,
        duplicateCount: 0,
        invalidCount: 0,
        importableCards: []
      }
    });
    mockImportAnalyzedCards.mockResolvedValue({
      importedCount: 1,
      duplicateCount: 0,
      invalidCount: 0
    });

    const { result } = renderHook(() =>
      useImportData({ isAuthenticated: true, onImportSuccess, onSyncRequested })
    );

    await act(async () => {
      await result.current.pickImportFile();
    });

    await waitFor(() => {
      expect(result.current.preview).not.toBeNull();
    });

    await act(async () => {
      await result.current.confirmImport();
    });

    expect(onImportSuccess).toHaveBeenCalled();
    expect(onSyncRequested).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Import complete',
      message: '1 card imported successfully',
      preset: 'done'
    });
  });

  it('does not trigger sync when nothing new is imported', async () => {
    const onSyncRequested = jest.fn().mockResolvedValue(undefined);

    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///backup.json', name: 'backup.json' }]
    });
    mockFileText.mockResolvedValue('{"ok":true}');
    mockAnalyzeImportPayload.mockResolvedValue({
      status: 'preview',
      preview: {
        fileName: 'backup.json',
        totalCards: 1,
        newCardsCount: 0,
        duplicateCount: 1,
        invalidCount: 0,
        importableCards: []
      }
    });
    mockImportAnalyzedCards.mockResolvedValue({
      importedCount: 0,
      duplicateCount: 1,
      invalidCount: 0
    });

    const { result } = renderHook(() => useImportData({ isAuthenticated: true, onSyncRequested }));

    await act(async () => {
      await result.current.pickImportFile();
    });

    await waitFor(() => {
      expect(result.current.preview).not.toBeNull();
    });

    await act(async () => {
      await result.current.confirmImport();
    });

    expect(onSyncRequested).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Import finished',
      message: 'No new cards were imported • 1 duplicate skipped',
      preset: 'done'
    });
  });

  it('classifies runtime import errors as import failures', async () => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///backup.json', name: 'backup.json' }]
    });
    mockFileText.mockResolvedValue('{"ok":true}');
    mockAnalyzeImportPayload.mockResolvedValue({
      status: 'preview',
      preview: {
        fileName: 'backup.json',
        totalCards: 1,
        newCardsCount: 1,
        duplicateCount: 0,
        invalidCount: 0,
        importableCards: []
      }
    });
    mockImportAnalyzedCards.mockRejectedValue(new Error('database locked'));

    const { result } = renderHook(() => useImportData({ isAuthenticated: false }));

    await act(async () => {
      await result.current.pickImportFile();
    });

    await waitFor(() => {
      expect(result.current.preview).not.toBeNull();
    });

    await act(async () => {
      await result.current.confirmImport();
    });

    expect(result.current.errorState).toEqual({
      title: 'Import Failed',
      message: 'database locked'
    });
  });
});
