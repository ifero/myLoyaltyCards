/**
 * CardDetails Component Tests
 * Story 13.3: Restyle Card Detail Screen
 */

import { render, fireEvent, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Alert } from 'react-native';

import { LoyaltyCard } from '@/core/schemas';

import { TOUCH_TARGET } from '@/shared/theme/spacing';

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
      background: '#FFFFFF',
      surface: '#FFFFFF',
      surfaceElevated: '#F5F5F5',
      textPrimary: '#1F1F24',
      textSecondary: '#66666B',
      textTertiary: '#8F8F94',
      primary: '#1A73E8',
      border: '#E5E5EB',
      error: '#DC2626'
    },
    isDark: false
  }),
  CARD_COLORS: {
    blue: '#1A73E8',
    red: '#E2231A',
    green: '#16A34A',
    orange: '#F59E0B',
    grey: '#64748B'
  }
}));

// Mock BarcodeRenderer
jest.mock('./BarcodeRenderer', () => ({
  BarcodeRenderer: () => null
}));

// Mock BrandHero
jest.mock('./BrandHero', () => ({
  BrandHero: ({ testID }: { testID?: string }) =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').createElement('View', { testID })
}));

// Mock FullscreenBarcode
jest.mock('./FullscreenBarcode', () => ({
  FullscreenBarcode: ({ visible, onClose }: { visible: boolean; onClose: () => void }) =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').createElement(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('react-native').View,
      { testID: 'fullscreen-barcode-modal', accessibilityState: { expanded: visible } },
      visible
        ? // eslint-disable-next-line @typescript-eslint/no-require-imports
          require('react').createElement(
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require('react-native').Pressable,
            {
              testID: 'fullscreen-barcode-close',
              onPress: onClose
            }
          )
        : null
    )
}));

// Mock useBrightness
jest.mock('../hooks/useBrightness', () => ({
  useBrightness: () => ({
    maximize: jest.fn(),
    restore: jest.fn()
  })
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockCustomCard: LoyaltyCard = {
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

const mockCatalogueCard: LoyaltyCard = {
  id: '660e8400-e29b-41d4-a716-446655440001',
  name: 'Conad',
  barcode: '9876543210123',
  barcodeFormat: 'EAN13',
  brandId: 'conad',
  color: 'red',
  isFavorite: false,
  lastUsedAt: null,
  usageCount: 0,
  createdAt: '2026-02-15T12:00:00Z',
  updatedAt: '2026-02-15T12:00:00Z'
};

describe('CardDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering — AC1: Brand Hero', () => {
    it('renders BrandHero component', () => {
      const { getByTestId } = render(<CardDetails card={mockCustomCard} />);
      expect(getByTestId('card-details-hero')).toBeTruthy();
    });
  });

  describe('Rendering — AC2: Barcode Display', () => {
    it('renders barcode preview area', () => {
      const { getByTestId } = render(<CardDetails card={mockCustomCard} />);
      expect(getByTestId('card-details-barcode-preview')).toBeTruthy();
    });

    it('renders formatted barcode number', () => {
      const { getByTestId } = render(<CardDetails card={mockCustomCard} />);
      expect(getByTestId('card-details-barcode-number-display')).toBeTruthy();
    });

    it('displays barcode number with spaces', () => {
      const { getByTestId } = render(<CardDetails card={mockCustomCard} />);
      const display = getByTestId('card-details-barcode-number-display');
      // "1234567890128" → "1234 5678 9012 8"
      expect(display.props.children).toBe('1234 5678 9012 8');
    });

    it('shows "Tap to enlarge" hint', () => {
      const { getByText } = render(<CardDetails card={mockCustomCard} />);
      expect(getByText('Tap to enlarge')).toBeTruthy();
    });
  });

  // Story 16.39 replaced Story 13.3's AC7 brightness HINT with a working control. The
  // hint told the user to go and raise their own brightness; the button lets them do it
  // in one tap — and, if they have opted in via Settings, it is already on when they
  // arrive. Note the app does NOT brighten by itself unless asked: the setting defaults
  // to off, which is why the hint had to be REPLACED rather than merely deleted.
  describe('Rendering — brightness toggle (Story 16.39, replaces 13.3 AC7)', () => {
    it('does NOT render the old brightness hint row', () => {
      const { queryByTestId } = render(<CardDetails card={mockCustomCard} />);
      expect(queryByTestId('card-details-brightness-hint')).toBeNull();
    });

    it('does NOT tell the user to raise their brightness by hand', () => {
      const { queryByText } = render(<CardDetails card={mockCustomCard} />);
      expect(queryByText('Increase brightness for scanning')).toBeNull();
    });

    it('renders no toggle when the screen supplies no handler', () => {
      // Keeps `CardDetails` usable on its own — Storybook, and any future read-only
      // surface — rather than rendering a control that cannot do anything.
      const { queryByTestId } = render(<CardDetails card={mockCustomCard} />);
      expect(queryByTestId('card-details-brightness-toggle')).toBeNull();
    });

    it('renders the toggle when a handler is supplied, and calls it on press', () => {
      const onToggleBrightness = jest.fn();
      const { getByTestId } = render(
        <CardDetails card={mockCustomCard} onToggleBrightness={onToggleBrightness} />
      );

      fireEvent.press(getByTestId('card-details-brightness-toggle'));

      expect(onToggleBrightness).toHaveBeenCalledTimes(1);
    });

    it('is icon-only, and the BULB carries the state (Story 16.39, ifero 2026-09-08)', () => {
      // Filled bulb = on, outline = off. With the caption gone this is the only visual
      // signal of which way the control is set, so it is pinned rather than left to a
      // colour change a colour-blind user might not read.
      const on = render(
        <CardDetails card={mockCustomCard} isBrightnessBoosted onToggleBrightness={jest.fn()} />
      );
      expect(on.getByTestId('card-details-brightness-toggle')).toBeTruthy();
      expect(on.queryByTestId('icon-lightbulb')).toBeTruthy();
      expect(on.queryByTestId('icon-lightbulb-outline')).toBeNull();

      const off = render(<CardDetails card={mockCustomCard} onToggleBrightness={jest.fn()} />);
      expect(off.queryByTestId('icon-lightbulb-outline')).toBeTruthy();
      expect(off.queryByTestId('icon-lightbulb')).toBeNull();
    });

    it('stays a full-size tap target despite carrying only a 24 pt glyph', () => {
      // The regression that removing a label invites: the pill used to be sized by its
      // text, so a circle around a 24 pt icon can silently end up half the required
      // size. Asserted against the token rather than a literal so a change to the
      // design system moves both together.
      const { getByTestId } = render(
        <CardDetails card={mockCustomCard} onToggleBrightness={jest.fn()} />
      );
      const styles = getByTestId('card-details-brightness-toggle').props.style;
      const flattened = Object.assign(
        {},
        ...(Array.isArray(styles) ? styles.flat(Infinity) : [styles]).filter(Boolean)
      );

      expect(flattened.width).toBeGreaterThanOrEqual(TOUCH_TARGET.min);
      expect(flattened.height).toBeGreaterThanOrEqual(TOUCH_TARGET.min);
    });

    it('renders no caption — the bulb is the whole control', () => {
      // Dropping the words was the point of the 2026-09-08 change. Asserted so a future
      // edit cannot quietly reintroduce a label under the barcode.
      const { queryByText } = render(
        <CardDetails card={mockCustomCard} onToggleBrightness={jest.fn()} />
      );

      expect(queryByText('Full brightness')).toBeNull();
    });

    it('keeps a spoken label, which is now the ONLY thing a screen reader has', () => {
      // Load-bearing rather than supplementary: an icon-only control with no
      // `accessibilityLabel` announces as an unnamed switch.
      const { getByTestId } = render(
        <CardDetails card={mockCustomCard} onToggleBrightness={jest.fn()} />
      );
      const toggle = getByTestId('card-details-brightness-toggle');

      expect(toggle.props.accessibilityLabel).toBe('Full brightness');
      expect(toggle.props.accessibilityHint).toBe(
        'Sets the screen to full brightness so a scanner can read the barcode'
      );
    });

    it('announces itself as a switch, with the state VoiceOver needs', () => {
      // `accessibilityRole="switch"` rather than `"button"`: the control has an on/off
      // state, and the role is what makes the platform announce it instead of reading
      // the label alone. A plain button would say "Full brightness" and leave a
      // VoiceOver user with no idea whether it is currently on.
      const { getByTestId } = render(
        <CardDetails card={mockCustomCard} isBrightnessBoosted onToggleBrightness={jest.fn()} />
      );
      const toggle = getByTestId('card-details-brightness-toggle');

      expect(toggle.props.accessibilityRole).toBe('switch');
      expect(toggle.props.accessibilityState).toEqual(expect.objectContaining({ checked: true }));
    });

    it('reports itself unchecked when the boost is off', () => {
      const { getByTestId } = render(
        <CardDetails card={mockCustomCard} onToggleBrightness={jest.fn()} />
      );

      expect(getByTestId('card-details-brightness-toggle').props.accessibilityState).toEqual(
        expect.objectContaining({ checked: false })
      );
    });
  });

  describe('Rendering — AC3: Card Info Section', () => {
    it('renders barcode number row', () => {
      const { getByTestId } = render(<CardDetails card={mockCustomCard} />);
      expect(getByTestId('card-details-barcode-number')).toBeTruthy();
    });

    it('does NOT render barcode format row (removed per design)', () => {
      const { queryByTestId } = render(<CardDetails card={mockCustomCard} />);
      expect(queryByTestId('card-details-format')).toBeNull();
    });

    it('renders color row for custom cards', () => {
      const { getByTestId } = render(<CardDetails card={mockCustomCard} />);
      expect(getByTestId('card-details-color')).toBeTruthy();
    });

    it('does NOT render color row for catalogue cards', () => {
      const { queryByTestId } = render(<CardDetails card={mockCatalogueCard} />);
      expect(queryByTestId('card-details-color')).toBeNull();
    });

    it('renders date added row', () => {
      const { getByTestId } = render(<CardDetails card={mockCustomCard} />);
      expect(getByTestId('card-details-date')).toBeTruthy();
    });

    it('renders info section container', () => {
      const { getByTestId } = render(<CardDetails card={mockCustomCard} />);
      expect(getByTestId('card-details-info-section')).toBeTruthy();
    });
  });

  describe('Rendering — AC4: Manage Actions', () => {
    it('renders Manage section header', () => {
      const { getByText } = render(<CardDetails card={mockCustomCard} />);
      expect(getByText('Manage')).toBeTruthy();
    });

    it('renders Edit card action row', () => {
      const { getByTestId } = render(<CardDetails card={mockCustomCard} />);
      expect(getByTestId('card-details-edit-row')).toBeTruthy();
    });

    it('renders Delete card action row', () => {
      const { getByTestId } = render(<CardDetails card={mockCustomCard} />);
      expect(getByTestId('card-details-delete-row')).toBeTruthy();
    });

    it('renders manage section container', () => {
      const { getByTestId } = render(<CardDetails card={mockCustomCard} />);
      expect(getByTestId('card-details-manage-section')).toBeTruthy();
    });
  });

  describe('Barcode Copy — AC3', () => {
    it('copies barcode to clipboard with MI icon', async () => {
      const { getByTestId } = render(<CardDetails card={mockCustomCard} />);

      fireEvent.press(getByTestId('card-details-barcode-number'));

      await waitFor(() => {
        expect(Clipboard.setStringAsync).toHaveBeenCalledWith('1234567890128');
      });
    });

    it('triggers haptic feedback on copy', async () => {
      const { getByTestId } = render(<CardDetails card={mockCustomCard} />);

      fireEvent.press(getByTestId('card-details-barcode-number'));

      await waitFor(() => {
        expect(Haptics.notificationAsync).toHaveBeenCalledWith(
          Haptics.NotificationFeedbackType.Success
        );
      });
    });

    it('calls onCopy callback after copy', async () => {
      const mockOnCopy = jest.fn();
      const { getByTestId } = render(<CardDetails card={mockCustomCard} onCopy={mockOnCopy} />);

      fireEvent.press(getByTestId('card-details-barcode-number'));

      await waitFor(() => {
        expect(mockOnCopy).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Fullscreen Barcode — AC6', () => {
    it('fullscreen barcode modal is initially hidden', () => {
      const { getByTestId } = render(<CardDetails card={mockCustomCard} />);
      const modal = getByTestId('fullscreen-barcode-modal');
      expect(modal.props.accessibilityState.expanded).toBe(false);
    });

    it('opens fullscreen barcode when barcode preview is tapped', async () => {
      const { getByTestId } = render(<CardDetails card={mockCustomCard} />);

      await waitFor(() => {
        fireEvent.press(getByTestId('card-details-barcode-preview'));
      });

      await waitFor(() => {
        expect(getByTestId('fullscreen-barcode-modal').props.accessibilityState.expanded).toBe(
          true
        );
      });
    });

    it('closes fullscreen barcode when close button is tapped', async () => {
      const { getByTestId } = render(<CardDetails card={mockCustomCard} />);

      // Open
      fireEvent.press(getByTestId('card-details-barcode-preview'));
      await waitFor(() => {
        expect(getByTestId('fullscreen-barcode-modal').props.accessibilityState.expanded).toBe(
          true
        );
      });

      // Close
      fireEvent.press(getByTestId('fullscreen-barcode-close'));
      await waitFor(() => {
        expect(getByTestId('fullscreen-barcode-modal').props.accessibilityState.expanded).toBe(
          false
        );
      });
    });
  });

  describe('Edit Navigation — AC4', () => {
    it('navigates to edit screen when Edit row is tapped', () => {
      const { getByTestId } = render(<CardDetails card={mockCustomCard} />);

      fireEvent.press(getByTestId('card-details-edit-row'));

      expect(mockPush).toHaveBeenCalledWith(`/card/${mockCustomCard.id}/edit`);
    });
  });

  describe('Delete Confirmation — AC4', () => {
    it('shows delete confirmation dialog', () => {
      const { getByTestId } = render(<CardDetails card={mockCustomCard} />);

      fireEvent.press(getByTestId('card-details-delete-row'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Card?',
        'Are you sure you want to delete "Test Store"? This action cannot be undone.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'Delete', style: 'destructive' })
        ]),
        { cancelable: true }
      );
    });

    it('calls onDelete callback when Delete is confirmed', () => {
      const mockOnDelete = jest.fn();
      const { getByTestId } = render(<CardDetails card={mockCustomCard} onDelete={mockOnDelete} />);

      fireEvent.press(getByTestId('card-details-delete-row'));

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = alertCall[2];
      const deleteButton = buttons.find((b: { text: string }) => b.text === 'Delete');
      deleteButton.onPress();

      expect(mockOnDelete).toHaveBeenCalled();
    });

    it('does not call onDelete when Cancel is pressed', () => {
      const mockOnDelete = jest.fn();
      const { getByTestId } = render(<CardDetails card={mockCustomCard} onDelete={mockOnDelete} />);

      fireEvent.press(getByTestId('card-details-delete-row'));

      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it('disables action rows when isDeleting is true', () => {
      const { getByTestId } = render(<CardDetails card={mockCustomCard} isDeleting={true} />);

      const editRow = getByTestId('card-details-edit-row');
      const deleteRow = getByTestId('card-details-delete-row');

      expect(editRow.props.accessibilityState?.disabled).toBe(true);
      expect(deleteRow.props.accessibilityState?.disabled).toBe(true);
    });

    it('shows "Deleting..." text when isDeleting is true', () => {
      const { getByText } = render(<CardDetails card={mockCustomCard} isDeleting={true} />);

      expect(getByText('Deleting...')).toBeTruthy();
    });

    it('shows "Delete card" text when not deleting', () => {
      const { getByText } = render(<CardDetails card={mockCustomCard} isDeleting={false} />);

      expect(getByText('Delete card')).toBeTruthy();
    });
  });

  describe('Date Formatting', () => {
    it('formats date correctly', () => {
      const { getByText } = render(<CardDetails card={mockCustomCard} />);
      expect(getByText('Jan 7, 2026')).toBeTruthy();
    });
  });

  describe('Color Display — custom cards only', () => {
    it('displays color name for custom cards', () => {
      const { getByText } = render(<CardDetails card={mockCustomCard} />);
      expect(getByText('Blue')).toBeTruthy();
    });

    it('hides color row for catalogue cards', () => {
      const { queryByTestId } = render(<CardDetails card={mockCatalogueCard} />);
      expect(queryByTestId('card-details-color')).toBeNull();
    });
  });

  describe('Scroll condensing — AC5', () => {
    it('sets a minimum content height to preserve full scroll range', () => {
      const { getByTestId } = render(<CardDetails card={mockCustomCard} />);

      const scrollView = getByTestId('card-details-scroll');
      const contentStyles = Array.isArray(scrollView.props.contentContainerStyle)
        ? scrollView.props.contentContainerStyle
        : [scrollView.props.contentContainerStyle];

      const minHeightStyle = contentStyles.find(
        (style: { minHeight?: number } | undefined) => style && typeof style.minHeight === 'number'
      );

      expect(minHeightStyle).toBeDefined();
      expect(minHeightStyle.minHeight).toBeGreaterThan(0);
    });

    it('calls onScrollPastHero(true) when scroll exceeds hero threshold', () => {
      const mockScrollCallback = jest.fn();
      const { getByTestId } = render(
        <CardDetails card={mockCustomCard} onScrollPastHero={mockScrollCallback} />
      );

      const scrollView = getByTestId('card-details-scroll');
      fireEvent.scroll(scrollView, {
        nativeEvent: { contentOffset: { y: 150 } }
      });

      expect(mockScrollCallback).toHaveBeenCalledWith(true);
    });

    it('calls onScrollPastHero(false) when scroll returns below threshold', () => {
      const mockScrollCallback = jest.fn();
      const { getByTestId } = render(
        <CardDetails card={mockCustomCard} onScrollPastHero={mockScrollCallback} />
      );

      const scrollView = getByTestId('card-details-scroll');

      // Scroll past
      fireEvent.scroll(scrollView, {
        nativeEvent: { contentOffset: { y: 150 } }
      });

      // Scroll back
      fireEvent.scroll(scrollView, {
        nativeEvent: { contentOffset: { y: 50 } }
      });

      expect(mockScrollCallback).toHaveBeenCalledWith(false);
    });

    it('does not call onScrollPastHero when scroll stays below threshold', () => {
      const mockScrollCallback = jest.fn();
      const { getByTestId } = render(
        <CardDetails card={mockCustomCard} onScrollPastHero={mockScrollCallback} />
      );

      const scrollView = getByTestId('card-details-scroll');
      fireEvent.scroll(scrollView, {
        nativeEvent: { contentOffset: { y: 50 } }
      });

      expect(mockScrollCallback).not.toHaveBeenCalled();
    });

    it('does not crash when onScrollPastHero is not provided', () => {
      const { getByTestId } = render(<CardDetails card={mockCustomCard} />);

      const scrollView = getByTestId('card-details-scroll');
      expect(() => {
        fireEvent.scroll(scrollView, {
          nativeEvent: { contentOffset: { y: 150 } }
        });
      }).not.toThrow();
    });
  });

  describe('Copy error handling', () => {
    it('shows error alert when clipboard copy fails', async () => {
      (Clipboard.setStringAsync as jest.Mock).mockRejectedValueOnce(new Error('Clipboard error'));

      const { getByTestId } = render(<CardDetails card={mockCustomCard} />);

      fireEvent.press(getByTestId('card-details-barcode-number'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to copy barcode to clipboard');
      });
    });

    it('does not trigger haptic or callback when copy fails', async () => {
      (Clipboard.setStringAsync as jest.Mock).mockRejectedValueOnce(new Error('fail'));

      const mockOnCopy = jest.fn();
      const { getByTestId } = render(<CardDetails card={mockCustomCard} onCopy={mockOnCopy} />);

      fireEvent.press(getByTestId('card-details-barcode-number'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });
      expect(Haptics.notificationAsync).not.toHaveBeenCalled();
      expect(mockOnCopy).not.toHaveBeenCalled();
    });

    it('copies barcode without onCopy callback', async () => {
      const { getByTestId } = render(<CardDetails card={mockCustomCard} />);

      fireEvent.press(getByTestId('card-details-barcode-number'));

      await waitFor(() => {
        expect(Clipboard.setStringAsync).toHaveBeenCalledWith('1234567890128');
        expect(Haptics.notificationAsync).toHaveBeenCalled();
      });
    });
  });

  describe('Color display fallback', () => {
    it('falls back to raw color value when not in COLOR_LABELS', () => {
      const unknownColorCard = { ...mockCustomCard, color: 'purple' as LoyaltyCard['color'] };
      const { getByText } = render(<CardDetails card={unknownColorCard} />);
      expect(getByText('purple')).toBeTruthy();
    });
  });

  describe('QR barcode format', () => {
    it('renders with QR dimensions', () => {
      const qrCard = { ...mockCustomCard, barcodeFormat: 'QR' as LoyaltyCard['barcodeFormat'] };
      const { getByTestId } = render(<CardDetails card={qrCard} />);
      expect(getByTestId('card-details-barcode-preview')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('barcode preview has correct accessibility attributes', () => {
      const { getByTestId } = render(<CardDetails card={mockCustomCard} />);

      const preview = getByTestId('card-details-barcode-preview');
      expect(preview.props.accessibilityRole).toBe('button');
      expect(preview.props.accessibilityLabel).toBe('View full screen barcode');
    });

    it('edit row has correct accessibility', () => {
      const { getByTestId } = render(<CardDetails card={mockCustomCard} />);

      const editRow = getByTestId('card-details-edit-row');
      expect(editRow.props.accessibilityRole).toBe('button');
    });

    it('delete row has correct accessibility label', () => {
      const { getByTestId } = render(<CardDetails card={mockCustomCard} />);

      const deleteRow = getByTestId('card-details-delete-row');
      expect(deleteRow.props.accessibilityRole).toBe('button');
      expect(deleteRow.props.accessibilityLabel).toBe('Delete card');
    });

    it('delete row has "Deleting card" label when isDeleting', () => {
      const { getByTestId } = render(<CardDetails card={mockCustomCard} isDeleting={true} />);

      const deleteRow = getByTestId('card-details-delete-row');
      expect(deleteRow.props.accessibilityLabel).toBe('Deleting card');
    });
  });
});
