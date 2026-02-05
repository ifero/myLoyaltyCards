/**
 * Add Card Brand Integration Test
 * Story 3.3: Add Card from Catalogue
 *
 * Integration test for full brand selection → scan → save flow.
 */

import { render, fireEvent, waitFor } from '@testing-library/react-native';
import * as Burnt from 'burnt';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';

import { insertCard, getAllCards } from '@/core/database';

import AddCardScreen from '../add-card';

// Mock dependencies
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  },
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  useFocusEffect: jest.fn(),
  useNavigation: jest.fn(() => ({
    addListener: jest.fn(() => jest.fn())
  }))
}));

jest.mock('expo-haptics');
jest.mock('burnt');
jest.mock('@/core/database');

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      background: '#FFFFFF',
      primary: '#007AFF',
      surface: '#F5F5F5',
      text: '#000000',
      textPrimary: '#000000',
      textSecondary: '#666666'
    }
  }),
  SEMANTIC_COLORS: {
    success: '#34C759'
  }
}));

jest.mock('@/features/cards/components/CatalogueGrid', () => ({
  CatalogueGrid: () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View, Text } = require('react-native');
    return (
      <View testID="catalogue-grid">
        <Text>Catalogue Grid</Text>
      </View>
    );
  }
}));

jest.mock('@/features/cards/components/CardForm', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CardForm: ({ defaultValues, onSubmit, testID }: any) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View, Button, Text } = require('react-native');
    return (
      <View testID={testID}>
        <Text testID="form-defaults">{JSON.stringify(defaultValues)}</Text>
        <Button
          title="Submit"
          onPress={() =>
            onSubmit({
              name: defaultValues?.name || 'Test Card',
              barcode: defaultValues?.barcode || '1234567890',
              barcodeFormat: defaultValues?.barcodeFormat || 'CODE128',
              color: defaultValues?.color || 'grey',
              brandId: defaultValues?.brandId
            })
          }
          testID="submit-button"
        />
      </View>
    );
  }
}));

describe('Add Card - Brand Integration (Story 3.3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Haptics.notificationAsync as jest.Mock).mockResolvedValue(undefined);
    (Burnt.toast as jest.Mock).mockReturnValue(undefined);
    (insertCard as jest.Mock).mockResolvedValue(undefined);
    (getAllCards as jest.Mock).mockResolvedValue([]);
  });

  it('should show brand context and prefill form with brand data', async () => {
    // Simulate params from catalogue → scan → add-card flow
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      brandId: 'esselunga',
      brandName: 'Esselunga',
      brandColor: '#E30613',
      brandFormat: 'EAN13',
      scannedBarcode: '1234567890123',
      scannedFormat: 'EAN13'
    });

    const { getByText, getByTestId } = render(<AddCardScreen />);

    // AC: Show brand name in header
    await waitFor(() => {
      expect(getByText('Adding Esselunga Card')).toBeTruthy();
    });

    // AC: Form defaults to brand data
    await waitFor(() => {
      const defaultsText = getByTestId('form-defaults').children[0] as string;
      const defaults = JSON.parse(defaultsText);
      expect(defaults.brandId).toBe('esselunga');
      expect(defaults.name).toBe('Esselunga');
      expect(defaults.barcode).toBe('1234567890123');
      expect(defaults.barcodeFormat).toBe('EAN13');
    });

    // Submit form
    fireEvent.press(getByTestId('submit-button'));

    // AC: brandId persisted in database
    await waitFor(() => {
      expect(insertCard).toHaveBeenCalledWith(
        expect.objectContaining({
          brandId: 'esselunga',
          name: 'Esselunga',
          barcode: '1234567890123'
        })
      );
    });
  });

  it('should preserve brand context when entering manually (no scan)', async () => {
    // Simulate params from catalogue → manual entry
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      brandId: 'conad',
      brandName: 'Conad',
      brandColor: '#FF0000',
      brandFormat: 'EAN13'
    });

    const { getByText, getByTestId } = render(<AddCardScreen />);

    // AC: Show brand name in header
    await waitFor(() => {
      expect(getByText('Adding Conad Card')).toBeTruthy();
    });

    // AC: Form shows brand context even without scanned barcode
    await waitFor(() => {
      const defaultsText = getByTestId('form-defaults').children[0] as string;
      const defaults = JSON.parse(defaultsText);
      expect(defaults.brandId).toBe('conad');
      expect(defaults.name).toBe('Conad');
      expect(defaults.barcodeFormat).toBe('EAN13');
    });
  });

  it('should work as normal custom card when no brand context', async () => {
    // No brand params - traditional custom card flow
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      scannedBarcode: '9876543210',
      scannedFormat: 'CODE128'
    });

    const { queryByText, getByTestId } = render(<AddCardScreen />);

    // No brand indicator shown
    expect(queryByText(/Adding .* Card/)).toBeNull();

    // Form defaults without brandId
    await waitFor(() => {
      const defaultsText = getByTestId('form-defaults').children[0] as string;
      const defaults = JSON.parse(defaultsText);
      expect(defaults.brandId).toBeUndefined();
      expect(defaults.barcode).toBe('9876543210');
    });

    // Submit form
    fireEvent.press(getByTestId('submit-button'));

    // AC: brandId is null for custom cards
    await waitFor(() => {
      expect(insertCard).toHaveBeenCalledWith(
        expect.objectContaining({
          brandId: null,
          barcode: '9876543210'
        })
      );
    });
  });
});
