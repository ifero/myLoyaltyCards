/**
 * Barcode Flash Screen Tests
 * Story 2.5 (screen); relocated + covered under Story 16.9.
 * Story 22.4: the loading state and frame C, white from their first frame.
 *
 * These tests were added when the screen moved from app/barcode/[id].tsx into
 * features/cards/screens/ (Story 16.9): app/ is excluded from coverage, so the
 * relocation surfaced a previously-unmeasured screen.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';

import { getCardById } from '@/core/database';

import { TYPOGRAPHY } from '@/shared/theme/typography';

import BarcodeScreen from './BarcodeScreen';

const mockBack = jest.fn();
const mockBarcodeFlash = jest.fn(
  (props: { card: unknown; onDismiss: () => void; isPresented?: boolean }) => {
    void props;
    return null;
  }
);

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: () => ({ back: mockBack })
}));

// One `t` throughout, as react-i18next keeps one per language. A new one on every render would
// re-run the screen's load, which depends on it, each time a press re-renders frame C.
const mockT = (key: string) => key;
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT })
}));

jest.mock('@/core/database', () => ({
  getCardById: jest.fn()
}));

jest.mock('@/core/utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() }
}));

// The frames' insets on a 393 × 852 phone.
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 })
}));

jest.mock('@/features/cards/components/BarcodeFlash', () => ({
  BarcodeFlash: (props: { card: unknown; onDismiss: () => void }) => mockBarcodeFlash(props)
}));

const mockCard = {
  id: 'card-1',
  name: 'Test Card',
  barcode: '123456789',
  barcodeFormat: 'EAN13'
};

const WHITE = '#FFFFFF';

const flat = (element: { props: { style: unknown } }) =>
  StyleSheet.flatten(element.props.style as never) as Record<string, unknown>;

describe('BarcodeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'card-1' });
    (getCardById as jest.Mock).mockResolvedValue(mockCard);
  });

  it('renders BarcodeFlash with the loaded card on success', async () => {
    const { queryByText } = render(<BarcodeScreen />);

    await waitFor(() => {
      expect(mockBarcodeFlash).toHaveBeenCalledWith(expect.objectContaining({ card: mockCard }));
    });
    expect(queryByText('cards.details.notFound')).toBeNull();
  });

  // The route cannot tell when its own fade has ended — on Android a cold link's first screen
  // reports no transition end — so it never holds the view's content back: a reveal waiting for
  // one would never come, and the barcode would never show.
  it('renders the view ungated: it never holds the content back', async () => {
    render(<BarcodeScreen />);

    await waitFor(() => expect(mockBarcodeFlash).toHaveBeenCalled());
    for (const [props] of mockBarcodeFlash.mock.calls) {
      expect(props.isPresented ?? true).toBe(true);
    }
  });

  it('dismisses via router.back when BarcodeFlash requests it', async () => {
    render(<BarcodeScreen />);

    await waitFor(() => expect(mockBarcodeFlash).toHaveBeenCalled());
    mockBarcodeFlash.mock.calls[0]![0].onDismiss();

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  // The route inherits the stack's `contentStyle`, black in dark mode: the loading state covers it
  // with white from its very first frame, before the card has loaded.
  it('loads on white from its first frame, with an ink spinner and a dark status bar', () => {
    (getCardById as jest.Mock).mockReturnValue(new Promise(() => {}));

    render(<BarcodeScreen />);
    const loading = screen.getByTestId('barcode-screen-loading');

    expect(flat(loading)).toMatchObject({ flex: 1, backgroundColor: WHITE });
    expect(screen.UNSAFE_getByType(ActivityIndicator).props.color).toBe('#181824');
    expect(screen.UNSAFE_getByType(StatusBar).props.style).toBe('dark');
    expect(mockBarcodeFlash).not.toHaveBeenCalled();
  });

  it('shows an invalid-id error when no id param is present', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});

    const { getByText } = render(<BarcodeScreen />);

    await waitFor(() => expect(getByText('cards.details.invalidId')).toBeTruthy());
    expect(getCardById).not.toHaveBeenCalled();
  });

  it('shows a not-found error when the card does not exist', async () => {
    (getCardById as jest.Mock).mockResolvedValue(null);

    const { getByText } = render(<BarcodeScreen />);

    await waitFor(() => expect(getByText('cards.details.notFound')).toBeTruthy());
  });

  it('shows a load-failed error when the lookup throws', async () => {
    (getCardById as jest.Mock).mockRejectedValue(new Error('db error'));

    const { getByText } = render(<BarcodeScreen />);

    await waitFor(() => expect(getByText('cards.details.loadFailed')).toBeTruthy());
  });

  describe('frame C', () => {
    beforeEach(() => {
      (getCardById as jest.Mock).mockResolvedValue(null);
    });

    it('is white edge to edge, centred between the insets on 24pt margins', async () => {
      render(<BarcodeScreen />);
      const frame = await screen.findByTestId('barcode-screen-not-found');

      expect(flat(frame)).toMatchObject({
        flex: 1,
        backgroundColor: WHITE,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingTop: 59,
        paddingBottom: 34
      });
      expect(screen.UNSAFE_getByType(StatusBar).props.style).toBe('dark');
    });

    it('sets the message in bodyLgStrong, in the light scheme’s error colour', async () => {
      render(<BarcodeScreen />);
      const message = await screen.findByText('cards.details.notFound');

      expect(flat(message)).toMatchObject({
        ...TYPOGRAPHY.bodyLgStrong,
        color: '#C41E1E',
        textAlign: 'center'
      });
    });

    it('puts "Go back" 32pt below it, as bodyLg ink text on a 48pt target', async () => {
      render(<BarcodeScreen />);
      const label = await screen.findByText('auth.verifyEmail.goBack');
      const target = screen.getByTestId('barcode-screen-go-back');
      const padding = flat(target).paddingVertical as number;

      expect(flat(label)).toMatchObject({ ...TYPOGRAPHY.bodyLg, color: '#181824' });
      expect(target.props.accessibilityRole).toBe('button');
      expect((flat(target).marginTop as number) + padding).toBe(32);
      expect(TYPOGRAPHY.bodyLg.lineHeight + 2 * padding).toBe(48);
      expect(flat(target)).toMatchObject({ minWidth: 48, minHeight: 48 });
    });

    it('draws nothing else: the message and "Go back" are its only text, and no spinner stays', async () => {
      render(<BarcodeScreen />);
      await screen.findByTestId('barcode-screen-not-found');

      expect(screen.UNSAFE_getAllByType(Text).map((text) => text.props.children)).toEqual([
        'cards.details.notFound',
        'auth.verifyEmail.goBack'
      ]);
      expect(screen.UNSAFE_queryAllByType(ActivityIndicator)).toHaveLength(0);
    });

    // § Buttons: a transparent button acknowledges a press with an 8 % wash of its label's colour.
    it('acknowledges a press on "Go back" with an 8 % ink wash, on a 12pt radius', async () => {
      render(<BarcodeScreen />);
      const target = await screen.findByTestId('barcode-screen-go-back');
      expect(flat(target)).toMatchObject({ borderRadius: 12 });
      expect(flat(target).backgroundColor).toBeUndefined();

      fireEvent(target, 'pressIn');
      expect(flat(screen.getByTestId('barcode-screen-go-back')).backgroundColor).toBe('#18182414');

      fireEvent(target, 'pressOut');
      expect(flat(screen.getByTestId('barcode-screen-go-back')).backgroundColor).toBeUndefined();
      expect(mockBack).not.toHaveBeenCalled();
    });

    it('leaves the screen from "Go back"', async () => {
      render(<BarcodeScreen />);

      fireEvent.press(await screen.findByText('auth.verifyEmail.goBack'));

      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('leaves the screen on VoiceOver’s escape gesture', async () => {
      render(<BarcodeScreen />);

      fireEvent(await screen.findByTestId('barcode-screen-not-found'), 'accessibilityEscape');

      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });
});
