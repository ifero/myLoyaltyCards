/**
 * CardDetails Component Tests
 * Story 2.6: View Card Details
 */

import { render, fireEvent, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Alert } from 'react-native';

import { LoyaltyCard } from '@/core/schemas';

import { CardDetails } from './CardDetails';

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush
  })
}));

// Mock expo-clipboard
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(undefined)
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error'
  }
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 })
}));

// Mock theme provider
jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      background: '#FAFAFA',
      surface: '#FFFFFF',
      textPrimary: '#1F2937',
      textSecondary: '#6B7280',
      primary: '#73A973',
      border: '#E5E7EB'
    }
  }),
  CARD_COLORS: {
    blue: '#3B82F6',
    red: '#EF4444',
    green: '#22C55E',
    orange: '#F97316',
    grey: '#6B7280'
  },
  SAGE_COLORS: {
    500: '#73A973'
  }
}));

// Mock BarcodeRenderer - return null component
jest.mock('./BarcodeRenderer', () => ({
  BarcodeRenderer: () => null
}));

// Mock VirtualLogo - forward testID prop
jest.mock('./VirtualLogo', () => ({
  VirtualLogo: jest.fn(({ testID }: { testID?: string }) =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').createElement('View', { testID })
  )
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockCard: LoyaltyCard = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Test Store',
  barcode: '1234567890128',
  barcodeFormat: 'EAN13',
  brandId: null,
  color: 'blue',
  isFavorite: false,
  lastUsedAt: null,
  usageCount: 0,
  createdAt: '2026-01-07T10:00:00Z',
  updatedAt: '2026-01-07T10:00:00Z'
};

describe('CardDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders card name prominently', () => {
      const { getByTestId } = render(<CardDetails card={mockCard} />);

      expect(getByTestId('card-details-name')).toBeTruthy();
    });

    it('renders Virtual Logo', () => {
      const { getByTestId } = render(<CardDetails card={mockCard} />);

      expect(getByTestId('card-details-logo')).toBeTruthy();
    });

    it('renders barcode preview', () => {
      const { getByTestId } = render(<CardDetails card={mockCard} />);

      expect(getByTestId('card-details-barcode-preview')).toBeTruthy();
    });

    it('renders barcode number', () => {
      const { getByTestId } = render(<CardDetails card={mockCard} />);

      expect(getByTestId('card-details-barcode-number')).toBeTruthy();
    });

    it('renders barcode format', () => {
      const { getByTestId } = render(<CardDetails card={mockCard} />);

      expect(getByTestId('card-details-format')).toBeTruthy();
    });

    it('renders card color', () => {
      const { getByTestId } = render(<CardDetails card={mockCard} />);

      expect(getByTestId('card-details-color')).toBeTruthy();
    });

    it('renders date added', () => {
      const { getByTestId } = render(<CardDetails card={mockCard} />);

      expect(getByTestId('card-details-date')).toBeTruthy();
    });

    it('renders Edit Card button', () => {
      const { getByTestId } = render(<CardDetails card={mockCard} />);

      expect(getByTestId('card-details-edit-button')).toBeTruthy();
    });

    it('renders Delete Card button', () => {
      const { getByTestId } = render(<CardDetails card={mockCard} />);

      expect(getByTestId('card-details-delete-button')).toBeTruthy();
    });
  });

  describe('Barcode Copy', () => {
    it('copies barcode to clipboard when number row is tapped', async () => {
      const { getByTestId } = render(<CardDetails card={mockCard} />);

      fireEvent.press(getByTestId('card-details-barcode-number'));

      await waitFor(() => {
        expect(Clipboard.setStringAsync).toHaveBeenCalledWith('1234567890128');
      });
    });

    it('triggers haptic feedback on copy', async () => {
      const { getByTestId } = render(<CardDetails card={mockCard} />);

      fireEvent.press(getByTestId('card-details-barcode-number'));

      await waitFor(() => {
        expect(Haptics.notificationAsync).toHaveBeenCalledWith(
          Haptics.NotificationFeedbackType.Success
        );
      });
    });

    it('calls onCopy callback after copy', async () => {
      const mockOnCopy = jest.fn();
      const { getByTestId } = render(<CardDetails card={mockCard} onCopy={mockOnCopy} />);

      fireEvent.press(getByTestId('card-details-barcode-number'));

      await waitFor(() => {
        expect(mockOnCopy).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Barcode Flash Navigation', () => {
    it('navigates to Barcode Flash when barcode preview is tapped', () => {
      const { getByTestId } = render(<CardDetails card={mockCard} />);

      fireEvent.press(getByTestId('card-details-barcode-preview'));

      expect(mockPush).toHaveBeenCalledWith(`/barcode/${mockCard.id}`);
    });
  });

  describe('Edit Navigation', () => {
    it('navigates to edit screen when Edit button is tapped', () => {
      const { getByTestId } = render(<CardDetails card={mockCard} />);

      fireEvent.press(getByTestId('card-details-edit-button'));

      expect(mockPush).toHaveBeenCalledWith(`/card/${mockCard.id}/edit`);
    });
  });

  describe('Delete Confirmation', () => {
    it('shows delete confirmation dialog when Delete button is tapped', () => {
      const { getByTestId } = render(<CardDetails card={mockCard} />);

      fireEvent.press(getByTestId('card-details-delete-button'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Card',
        'Are you sure you want to delete "Test Store"?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'Delete', style: 'destructive' })
        ])
      );
    });
  });

  describe('Date Formatting', () => {
    it('formats date correctly', () => {
      const { getByText } = render(<CardDetails card={mockCard} />);

      // Should format "2026-01-07T10:00:00Z" as "Jan 7, 2026"
      expect(getByText('Jan 7, 2026')).toBeTruthy();
    });
  });

  describe('Barcode Format Labels', () => {
    it('displays human-readable format for EAN-13', () => {
      const { getByText } = render(<CardDetails card={mockCard} />);

      expect(getByText('EAN-13')).toBeTruthy();
    });

    it('displays human-readable format for QR', () => {
      const qrCard: LoyaltyCard = { ...mockCard, barcodeFormat: 'QR' };
      const { getByText } = render(<CardDetails card={qrCard} />);

      expect(getByText('QR Code')).toBeTruthy();
    });

    it('displays human-readable format for Code 128', () => {
      const code128Card: LoyaltyCard = { ...mockCard, barcodeFormat: 'CODE128' };
      const { getByText } = render(<CardDetails card={code128Card} />);

      expect(getByText('Code 128')).toBeTruthy();
    });
  });

  describe('Color Display', () => {
    it('displays color name', () => {
      const { getByText } = render(<CardDetails card={mockCard} />);

      expect(getByText('Blue')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('barcode preview has correct accessibility attributes', () => {
      const { getByTestId } = render(<CardDetails card={mockCard} />);

      const preview = getByTestId('card-details-barcode-preview');
      expect(preview.props.accessibilityRole).toBe('button');
      expect(preview.props.accessibilityLabel).toBe('View full screen barcode');
    });

    it('edit button has correct accessibility label', () => {
      const { getByTestId } = render(<CardDetails card={mockCard} />);

      const editButton = getByTestId('card-details-edit-button');
      expect(editButton.props.accessibilityRole).toBe('button');
      expect(editButton.props.accessibilityLabel).toBe('Edit card');
    });

    it('delete button has correct accessibility label', () => {
      const { getByTestId } = render(<CardDetails card={mockCard} />);

      const deleteButton = getByTestId('card-details-delete-button');
      expect(deleteButton.props.accessibilityRole).toBe('button');
      expect(deleteButton.props.accessibilityLabel).toBe('Delete card');
    });
  });
});
