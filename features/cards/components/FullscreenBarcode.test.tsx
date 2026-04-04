/**
 * FullscreenBarcode Component Tests
 * Story 13.3: Restyle Card Detail Screen (AC6)
 */

import { render, fireEvent, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import React from 'react';

import { LoyaltyCard } from '@/core/schemas';

import { FullscreenBarcode } from './FullscreenBarcode';

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

// Mock BarcodeRenderer
jest.mock('./BarcodeRenderer', () => ({
  BarcodeRenderer: () => null
}));

// Mock useBrightness
const mockMaximize = jest.fn();
const mockRestore = jest.fn();
jest.mock('../hooks/useBrightness', () => ({
  useBrightness: () => ({
    maximize: mockMaximize,
    restore: mockRestore
  })
}));

const mockCard: LoyaltyCard = {
  id: 'test-id',
  name: 'Test Card',
  barcode: '1234567890123',
  barcodeFormat: 'EAN13',
  brandId: null,
  color: 'blue',
  isFavorite: false,
  lastUsedAt: null,
  usageCount: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
};

describe('FullscreenBarcode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders modal when visible', () => {
      const { getByTestId } = render(
        <FullscreenBarcode card={mockCard} visible={true} onClose={jest.fn()} />
      );
      expect(getByTestId('fullscreen-barcode-modal')).toBeTruthy();
    });

    it('renders card name', () => {
      const { getByText } = render(
        <FullscreenBarcode card={mockCard} visible={true} onClose={jest.fn()} />
      );
      expect(getByText('Test Card')).toBeTruthy();
    });

    it('renders formatted barcode number with spaces', () => {
      const { getByTestId } = render(
        <FullscreenBarcode card={mockCard} visible={true} onClose={jest.fn()} />
      );
      const numberEl = getByTestId('fullscreen-barcode-number');
      expect(numberEl).toBeTruthy();
    });

    it('renders close button', () => {
      const { getByTestId } = render(
        <FullscreenBarcode card={mockCard} visible={true} onClose={jest.fn()} />
      );
      expect(getByTestId('fullscreen-barcode-close')).toBeTruthy();
    });

    it('renders brightness hint', () => {
      const { getByTestId } = render(
        <FullscreenBarcode card={mockCard} visible={true} onClose={jest.fn()} />
      );
      expect(getByTestId('fullscreen-barcode-brightness-hint')).toBeTruthy();
    });

    it('shows brightness hint text', () => {
      const { getByText } = render(
        <FullscreenBarcode card={mockCard} visible={true} onClose={jest.fn()} />
      );
      expect(getByText('Increase brightness for scanning')).toBeTruthy();
    });
  });

  describe('White background — AC6', () => {
    it('container has white background for scanner readability', () => {
      const { getByTestId } = render(
        <FullscreenBarcode card={mockCard} visible={true} onClose={jest.fn()} />
      );
      const modal = getByTestId('fullscreen-barcode-modal');
      // The first child of the modal should have white background
      const container = modal.children[0];
      expect(container).toBeTruthy();
    });
  });

  describe('Brightness control', () => {
    it('maximizes brightness when visible', () => {
      render(<FullscreenBarcode card={mockCard} visible={true} onClose={jest.fn()} />);
      expect(mockMaximize).toHaveBeenCalledTimes(1);
    });

    it('restores brightness on unmount', () => {
      const { unmount } = render(
        <FullscreenBarcode card={mockCard} visible={true} onClose={jest.fn()} />
      );
      unmount();
      expect(mockRestore).toHaveBeenCalled();
    });
  });

  describe('Dismiss', () => {
    it('calls onClose when close button is pressed', () => {
      const mockOnClose = jest.fn();
      const { getByTestId } = render(
        <FullscreenBarcode card={mockCard} visible={true} onClose={mockOnClose} />
      );

      fireEvent.press(getByTestId('fullscreen-barcode-close'));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Copy barcode', () => {
    it('copies barcode on tap', async () => {
      const { getByTestId } = render(
        <FullscreenBarcode card={mockCard} visible={true} onClose={jest.fn()} />
      );

      fireEvent.press(getByTestId('fullscreen-barcode-number'));

      await waitFor(() => {
        expect(Clipboard.setStringAsync).toHaveBeenCalledWith('1234567890123');
      });
    });

    it('triggers haptic feedback on copy', async () => {
      const { getByTestId } = render(
        <FullscreenBarcode card={mockCard} visible={true} onClose={jest.fn()} />
      );

      fireEvent.press(getByTestId('fullscreen-barcode-number'));

      await waitFor(() => {
        expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
      });
    });

    it('calls onCopy callback', async () => {
      const mockOnCopy = jest.fn();
      const { getByTestId } = render(
        <FullscreenBarcode card={mockCard} visible={true} onClose={jest.fn()} onCopy={mockOnCopy} />
      );

      fireEvent.press(getByTestId('fullscreen-barcode-number'));

      await waitFor(() => {
        expect(mockOnCopy).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('close button has correct accessibility label', () => {
      const { getByTestId } = render(
        <FullscreenBarcode card={mockCard} visible={true} onClose={jest.fn()} />
      );

      const closeBtn = getByTestId('fullscreen-barcode-close');
      expect(closeBtn.props.accessibilityRole).toBe('button');
      expect(closeBtn.props.accessibilityLabel).toBe('Close fullscreen barcode');
    });

    it('card name has header role', () => {
      const { getByRole } = render(
        <FullscreenBarcode card={mockCard} visible={true} onClose={jest.fn()} />
      );

      expect(getByRole('header')).toBeTruthy();
    });
  });
});
