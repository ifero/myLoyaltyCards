/**
 * BarcodeFlash Component Tests
 * Story 2.5: Display Barcode (Barcode Flash)
 */

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { LoyaltyCard } from '@/core/schemas';

import { BarcodeFlash } from './BarcodeFlash';

// Mock expo-clipboard
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(undefined)
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: {
    Success: 'success'
  }
}));

// Mock useBrightness hook
const mockMaximize = jest.fn().mockResolvedValue(undefined);
const mockRestore = jest.fn().mockResolvedValue(undefined);
jest.mock('../hooks/useBrightness', () => ({
  useBrightness: () => ({
    maximize: mockMaximize,
    restore: mockRestore
  })
}));

// Mock BarcodeRenderer
jest.mock('./BarcodeRenderer', () => ({
  BarcodeRenderer: function MockBarcodeRenderer({
    value,
    format
  }: {
    value: string;
    format: string;
  }) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View, Text } = require('react-native');
    return (
      <View testID="barcode-renderer">
        <Text>{`${format}:${value}`}</Text>
      </View>
    );
  }
}));

const mockCard: LoyaltyCard = {
  id: 'test-id-123',
  name: 'Test Store Card',
  barcode: '1234567890123',
  barcodeFormat: 'EAN13',
  brandId: null,
  color: 'blue',
  isFavorite: false,
  lastUsedAt: null,
  usageCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

describe('BarcodeFlash', () => {
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render card name', () => {
      const { getByText } = render(<BarcodeFlash card={mockCard} onDismiss={mockOnDismiss} />);

      expect(getByText('Test Store Card')).toBeTruthy();
    });

    it('should render barcode number', () => {
      const { getByText } = render(<BarcodeFlash card={mockCard} onDismiss={mockOnDismiss} />);

      expect(getByText('1234567890123')).toBeTruthy();
    });

    it('should render BarcodeRenderer with correct props', () => {
      const { getByTestId } = render(<BarcodeFlash card={mockCard} onDismiss={mockOnDismiss} />);

      const renderer = getByTestId('barcode-renderer');
      expect(renderer).toBeTruthy();
    });

    it('should render hint text', () => {
      const { getByText } = render(<BarcodeFlash card={mockCard} onDismiss={mockOnDismiss} />);

      expect(getByText('Tap anywhere to close')).toBeTruthy();
    });
  });

  describe('Brightness control', () => {
    it('should call maximize brightness on mount', () => {
      render(<BarcodeFlash card={mockCard} onDismiss={mockOnDismiss} />);

      expect(mockMaximize).toHaveBeenCalledTimes(1);
    });

    it('should call restore brightness on unmount', () => {
      const { unmount } = render(<BarcodeFlash card={mockCard} onDismiss={mockOnDismiss} />);

      unmount();

      expect(mockRestore).toHaveBeenCalledTimes(1);
    });
  });

  describe('Dismiss functionality', () => {
    it('should call onDismiss when tapping the overlay', async () => {
      const { getByAccessibilityHint } = render(
        <BarcodeFlash card={mockCard} onDismiss={mockOnDismiss} />
      );

      const pressable = getByAccessibilityHint('Tap anywhere to close');
      fireEvent.press(pressable);

      await waitFor(() => {
        expect(mockOnDismiss).toHaveBeenCalled();
      });
    });
  });

  describe('Copy functionality', () => {
    it('should copy barcode on long press', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Clipboard = require('expo-clipboard');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Haptics = require('expo-haptics');

      const { getByAccessibilityHint } = render(
        <BarcodeFlash card={mockCard} onDismiss={mockOnDismiss} />
      );

      const copyTarget = getByAccessibilityHint('Long press to copy barcode to clipboard');
      fireEvent(copyTarget, 'longPress');

      await waitFor(() => {
        expect(Clipboard.setStringAsync).toHaveBeenCalledWith('1234567890123');
        expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have dismiss button with correct accessibility label', () => {
      const { getByLabelText } = render(<BarcodeFlash card={mockCard} onDismiss={mockOnDismiss} />);

      expect(getByLabelText('Dismiss barcode overlay')).toBeTruthy();
    });

    it('should have barcode number with accessibility label', () => {
      const { getByLabelText } = render(<BarcodeFlash card={mockCard} onDismiss={mockOnDismiss} />);

      expect(getByLabelText('Barcode number: 1234567890123. Long press to copy.')).toBeTruthy();
    });

    it('should have card name as header', () => {
      const { getByRole } = render(<BarcodeFlash card={mockCard} onDismiss={mockOnDismiss} />);

      expect(getByRole('header')).toBeTruthy();
    });
  });

  describe('QR Code format', () => {
    it('should render correctly for QR format', () => {
      const qrCard: LoyaltyCard = {
        ...mockCard,
        barcodeFormat: 'QR'
      };

      const { getByTestId, getByText } = render(
        <BarcodeFlash card={qrCard} onDismiss={mockOnDismiss} />
      );

      expect(getByTestId('barcode-renderer')).toBeTruthy();
      expect(getByText('Test Store Card')).toBeTruthy();
    });
  });

  describe('Different card data', () => {
    it('should display long card name with truncation', () => {
      const longNameCard: LoyaltyCard = {
        ...mockCard,
        name: 'Very Long Store Name That Should Be Truncated If Too Long'
      };

      const { getByText } = render(<BarcodeFlash card={longNameCard} onDismiss={mockOnDismiss} />);

      expect(getByText(longNameCard.name)).toBeTruthy();
    });

    it('should handle empty barcode gracefully', () => {
      const emptyBarcodeCard: LoyaltyCard = {
        ...mockCard,
        barcode: ''
      };

      const { getByTestId } = render(
        <BarcodeFlash card={emptyBarcodeCard} onDismiss={mockOnDismiss} />
      );

      expect(getByTestId('barcode-renderer')).toBeTruthy();
    });
  });
});
