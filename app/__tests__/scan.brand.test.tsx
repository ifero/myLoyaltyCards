/**
 * Legacy Scan Route Tests
 *
 * Verifies `/scan` redirects to new Story 13.4 scanner route.
 */

import { render, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import ScanScreen from '../scan';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn()
}));

describe('ScanScreen legacy bridge', () => {
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ replace: mockReplace });
  });

  it('redirects to /add-card/scan preserving brand params', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      brandId: 'esselunga',
      brandName: 'Esselunga',
      brandColor: '#E30613',
      brandFormat: 'EAN13'
    });

    render(<ScanScreen />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/add-card/scan',
        params: {
          brandId: 'esselunga',
          brandName: 'Esselunga',
          brandColor: '#E30613',
          brandFormat: 'EAN13'
        }
      });
    });
  });

  it('redirects to /add-card/scan with empty params when no brand context', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});

    render(<ScanScreen />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/add-card/scan',
        params: {}
      });
    });
  });
});
