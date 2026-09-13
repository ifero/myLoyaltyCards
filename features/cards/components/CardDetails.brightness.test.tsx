/**
 * Card detail brightness integration tests
 * Story 16.39: Full brightness on the card detail screen — AC4, AC5
 *
 * ⚠️ Every other suite in this story mocks one of the two brightness consumers away.
 * `CardDetails.test.tsx` replaces `FullscreenBarcode` with a stub AND stubs
 * `useBrightness`; `CardDetailScreen.test.tsx` stubs `useCardBrightnessBoost`;
 * and `useBrightness.nesting.test.ts` calls `maximize`/`restore` by hand in an order
 * the author *believes* the effects produce. None of them executes the real wiring, so
 * none of them would notice a change to `FullscreenBarcode`'s effect — its dependency
 * array or its `if (visible)` guards — silently reordering or dropping a call.
 *
 * This file closes that gap. `Harness` below wires the REAL `useCardBrightnessBoost`
 * into the REAL `CardDetails` — so its switch is the real control, driving the real
 * hook — and `CardDetails` renders the REAL `FullscreenBarcode`. Both the screen's and
 * the overlay's `useBrightness` instances are real, and they talk to one mocked
 * `expo-brightness`. Assertions are on the actual `setBrightnessAsync` sequence React's
 * effect scheduling produces. Only the leaves that cannot run under jsdom are stubbed.
 *
 * What it protects: the phone must never be left at 100 % brightness after the user
 * walks away from a card, and must never drop out of full brightness while a barcode
 * is still on screen in front of a scanner.
 */

import { render, fireEvent, act } from '@testing-library/react-native';
import React from 'react';

import { LoyaltyCard } from '@/core/schemas';

import { CardDetails } from './CardDetails';
import { useCardBrightnessBoost } from '../hooks/useCardBrightnessBoost';

/** The level the user actually had their phone on before opening the card. */
const USER_LEVEL = 0.35;

const mockGetBrightnessAsync = jest.fn();
const mockSetBrightnessAsync = jest.fn();

// The ONLY thing standing in for a device. Both `useBrightness` instances — the
// screen's and the overlay's — talk to this one module, exactly as they would on
// hardware.
jest.mock('expo-brightness', () => ({
  getBrightnessAsync: () => mockGetBrightnessAsync(),
  setBrightnessAsync: (value: number) => mockSetBrightnessAsync(value)
}));

// Focus-cycle mock, matching the one `useCardBrightnessBoost.test.ts` uses:
// captures the cleanup so a blur can be fired, which is the half a mount-scoped
// implementation would get wrong.
// Identity-compared, like the real `useFocusEffect` and like the hook's own suite:
// running the callback on every render would both misrepresent an effect and, now that
// the callback resets per-visit state, spin.
// Kept byte-for-byte equivalent to the one in `useCardBrightnessBoost.test.ts`, and
// deliberately so: it invokes the PRIOR cleanup before running a new callback on an
// identity change, which is what the real `useFocusEffect` does. A mock that merely
// stacked cleanups would silently accumulate stale `AppState` listeners if anyone
// reintroduced a boost-dependent dependency into the focus effect — i.e. it would hide
// a reversion of the exact bug this story fixed.
let mockLatestCallback: (() => void | (() => void)) | null = null;
let mockLatestCleanup: (() => void) | null = null;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (callback: () => void | (() => void)) => {
    if (callback === mockLatestCallback) {
      return;
    }

    if (mockLatestCleanup) {
      mockLatestCleanup();
      mockLatestCleanup = null;
    }

    mockLatestCallback = callback;
    const cleanup = callback();
    mockLatestCleanup = typeof cleanup === 'function' ? cleanup : null;
  }
}));

// The Settings toggle, which the hook reads. Default OFF, as shipped — the tests that
// want it on say so.
const mockGetAutoBrightnessEnabled = jest.fn(() => false);
jest.mock('@/core/settings/settings-repository', () => ({
  getAutoBrightnessEnabled: () => mockGetAutoBrightnessEnabled()
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' }
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 })
}));

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

// Barcode rendering itself is irrelevant here and needs native modules.
// `FullscreenBarcode` is deliberately NOT mocked — it is half the subject.
jest.mock('./BarcodeRenderer', () => ({ BarcodeRenderer: () => null }));
jest.mock('./BrandHero', () => ({
  BrandHero: ({ testID }: { testID?: string }) =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').createElement('View', { testID })
}));

const mockCard: LoyaltyCard = {
  id: 'card-1',
  name: 'Test Card',
  barcode: '1234567890128',
  barcodeFormat: 'EAN13',
  color: 'blue',
  brandId: null,
  isFavorite: false,
  usageCount: 0,
  lastUsedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

/**
 * What `CardDetailScreen` does: own the hook, hand its state to the component.
 *
 * Rendering these together rather than side by side is the point — it is the only place
 * in the suite where pressing the real switch drives the real hook, which drives the
 * real `useBrightness`, which reaches the (mocked) device.
 */
const Harness = () => {
  const { isBoosted, toggle } = useCardBrightnessBoost();

  return (
    <CardDetails card={mockCard} isBrightnessBoosted={isBoosted} onToggleBrightness={toggle} />
  );
};

/** Fire the focus cleanup — the user navigating away from the detail screen. */
const blurScreen = async () => {
  expect(mockLatestCleanup).not.toBeNull();
  const cleanup = mockLatestCleanup!;
  mockLatestCleanup = null;
  mockLatestCallback = null;
  await act(async () => {
    cleanup();
  });
};

describe('card detail brightness — real wiring (Story 16.39 AC4, AC5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLatestCallback = null;
    mockLatestCleanup = null;
    mockGetAutoBrightnessEnabled.mockReturnValue(false);
    // Behaves like a device: reading back whatever was last written.
    let current = USER_LEVEL;
    mockGetBrightnessAsync.mockImplementation(() => Promise.resolve(current));
    mockSetBrightnessAsync.mockImplementation((value: number) => {
      current = value;
      return Promise.resolve();
    });
  });

  it('returns the user to their own level after enlarge → close → leave', async () => {
    // The screen's focus effect and the component tree, both real.
    mockGetAutoBrightnessEnabled.mockReturnValue(true);
    const { getByTestId } = render(<Harness />);

    await act(async () => {});
    expect(mockSetBrightnessAsync).toHaveBeenLastCalledWith(1.0);

    // Enlarge. This drives FullscreenBarcode's OWN effect — the one no other test in
    // this story executes — which samples a brightness the screen already set to 1.0.
    await act(async () => {
      fireEvent.press(getByTestId('card-details-barcode-preview'));
    });
    expect(mockSetBrightnessAsync).toHaveBeenLastCalledWith(1.0);

    // Close the overlay. Brightness must NOT drop: the barcode is still on screen
    // behind it, which is the entire point of the story.
    await act(async () => {
      fireEvent.press(getByTestId('fullscreen-barcode-close'));
    });
    expect(mockSetBrightnessAsync).toHaveBeenLastCalledWith(1.0);

    // Leave the screen. Now — and only now — the user's real level comes back. If the
    // overlay's instance had clobbered the screen's captured value, this would be 1.0
    // and the phone would be stranded at full brightness.
    await blurScreen();
    expect(mockSetBrightnessAsync).toHaveBeenLastCalledWith(USER_LEVEL);
  });

  it('leaves brightness alone entirely when the setting is off (the shipped default)', async () => {
    // The most important row in this file after Story 16.39's redesign: a user who
    // never opted in and never pressed the button must have their screen untouched by
    // simply opening a card. Only the OVERLAY may brighten, and only when opened.
    render(<Harness />);

    await act(async () => {});

    expect(mockSetBrightnessAsync).not.toHaveBeenCalled();
  });

  it('drives the whole chain from a real press on the real switch', async () => {
    // The setting is OFF, so nothing has touched brightness yet. This is the one test
    // that goes press → hook → `useBrightness` → device, with no piece stubbed.
    const { getByTestId } = render(<Harness />);
    await act(async () => {});
    expect(mockSetBrightnessAsync).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.press(getByTestId('card-details-brightness-toggle'));
    });
    expect(mockSetBrightnessAsync).toHaveBeenLastCalledWith(1.0);

    // Pressing again gives the user their own level back, without leaving the screen.
    await act(async () => {
      fireEvent.press(getByTestId('card-details-brightness-toggle'));
    });
    expect(mockSetBrightnessAsync).toHaveBeenLastCalledWith(USER_LEVEL);
  });

  it('restores the user level when the overlay is never opened', async () => {
    mockGetAutoBrightnessEnabled.mockReturnValue(true);
    render(<Harness />);

    await act(async () => {});
    expect(mockSetBrightnessAsync).toHaveBeenLastCalledWith(1.0);

    await blurScreen();
    expect(mockSetBrightnessAsync).toHaveBeenLastCalledWith(USER_LEVEL);
  });

  it('survives repeated enlarge/close cycles without losing the user level', async () => {
    mockGetAutoBrightnessEnabled.mockReturnValue(true);
    const { getByTestId } = render(<Harness />);
    await act(async () => {});

    for (let i = 0; i < 3; i += 1) {
      await act(async () => {
        fireEvent.press(getByTestId('card-details-barcode-preview'));
      });
      await act(async () => {
        fireEvent.press(getByTestId('fullscreen-barcode-close'));
      });
      // Never dips mid-cycle — a scanner may be reading throughout.
      expect(mockSetBrightnessAsync).toHaveBeenLastCalledWith(1.0);
    }

    await blurScreen();
    expect(mockSetBrightnessAsync).toHaveBeenLastCalledWith(USER_LEVEL);
  });

  it('never leaves the phone brighter than the user set it', async () => {
    mockGetAutoBrightnessEnabled.mockReturnValue(true);
    const { getByTestId } = render(<Harness />);
    await act(async () => {});

    await act(async () => {
      fireEvent.press(getByTestId('card-details-barcode-preview'));
    });
    await blurScreen();

    // The blunt statement of the invariant, independent of call ordering: whatever
    // sequence the effects produced, the LAST thing written is the user's own level.
    // Deliberately exercised with the overlay still open, the one ordering the
    // hand-sequenced nesting suite does not cover.
    const written = mockSetBrightnessAsync.mock.calls.map(([value]) => value);
    expect(written.at(-1)).toBe(USER_LEVEL);
  });
});
