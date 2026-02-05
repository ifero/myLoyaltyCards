/**
 * Scan Screen Tests - Brand Context (Story 3.3)
 *
 * Tests for brand-aware scanning flow.
 */

import { render, fireEvent } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import ScanScreen from '../scan';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(() => ({
    brandId: 'esselunga',
    brandName: 'Esselunga',
    brandColor: '#E30613',
    brandFormat: 'EAN13'
  }))
}));

jest.mock('@/features/cards', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  BarcodeScanner: ({ onScan, onManualEntry }: any) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View, Button } = require('react-native');
    return (
      <View>
        <Button
          title="Scan Success"
          onPress={() =>
            onScan({ barcode: '1234567890', format: 'EAN13' })
          }
          testID="mock-scan-button"
        />
        <Button
          title="Manual Entry"
          onPress={onManualEntry}
          testID="mock-manual-button"
        />
      </View>
    );
  }
}));

describe('ScanScreen - Brand Context (Story 3.3)', () => {
  const mockReplace = jest.fn();
  const mockBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
      back: mockBack
    });
  });

  it('should forward brand params when scan succeeds', () => {
    const { getByTestId } = render(<ScanScreen />);

    fireEvent.press(getByTestId('mock-scan-button'));

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/add-card',
      params: {
        scannedBarcode: '1234567890',
        scannedFormat: 'EAN13',
        brandId: 'esselunga',
        brandName: 'Esselunga',
        brandColor: '#E30613',
        brandFormat: 'EAN13'
      }
    });
  });

  it('should forward brand params on manual entry fallback', () => {
    const { getByTestId } = render(<ScanScreen />);

    fireEvent.press(getByTestId('mock-manual-button'));

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/add-card',
      params: {
        brandId: 'esselunga',
        brandName: 'Esselunga',
        brandColor: '#E30613',
        brandFormat: 'EAN13'
      }
    });
  });
});
