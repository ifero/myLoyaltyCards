/**
 * Card Details Screen Tests
 * Story 13.3 (screen); relocated + covered under Story 16.9.
 * Story 21.2: the header's fill and the favourite star — AC7, AC9.
 *
 * Added when the screen moved from app/card/[id].tsx into
 * features/cards/screens/ (Story 16.9). Behaviour is unchanged; app/ is
 * excluded from coverage, so the move surfaced a previously-unmeasured screen.
 */

import { act, render, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

import { getCardById } from '@/core/database';

import { showToast } from '@/shared/toast';

import { useCardBrightnessBoost } from '@/features/cards/hooks/useCardBrightnessBoost';

import CardDetailScreen from './CardDetailScreen';

type CardDetailsMockProps = {
  card: unknown;
  isDeleting: boolean;
  onCopy: () => void;
  onDelete: () => void;
  onScrollPastHero: (past: boolean) => void;
  /** Story 16.39 — the brightness boost state and its toggle, passed down. */
  isBrightnessBoosted: boolean;
  onToggleBrightness: () => void;
};

type ScreenProps = {
  options?: {
    headerLeft?: () => unknown;
    headerRight?: () => unknown;
    headerStyle?: { backgroundColor?: string };
  };
};

const mockBack = jest.fn();
const mockToggle = jest.fn();
const mockToggleBrightness = jest.fn();
const mockDeleteCard = jest.fn();
const mockCardDetails = jest.fn((props: CardDetailsMockProps) => {
  void props;
  return null;
});
const mockUseBrandLogo = jest.fn();
const mockScreenOptions = jest.fn();

// Stack.Screen invokes headerLeft/headerRight so the header ternaries
// (favorite state, tint colour) are exercised without a real navigator, and
// records the options so the header FILL is assertable rather than merely run.
jest.mock('expo-router', () => {
  const Stack = () => null;
  (Stack as { Screen?: (props: ScreenProps) => null }).Screen = (props: ScreenProps) => {
    props.options?.headerLeft?.();
    props.options?.headerRight?.();
    mockScreenOptions(props.options);
    return null;
  };
  // Mimic focus-once semantics: run the callback once on mount (a bare
  // `(cb) => cb()` would re-run fetchCard on every render → update loop).
  return {
    Stack,
    useLocalSearchParams: jest.fn(),
    useRouter: () => ({ back: mockBack }),
    useFocusEffect: (cb: () => void) => jest.requireActual('react').useEffect(cb, [])
  };
});

jest.mock('@expo/vector-icons', () => ({ MaterialIcons: () => null }));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

jest.mock('@/core/database', () => ({
  getCardById: jest.fn()
}));

jest.mock('@/core/utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() }
}));

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      background: '#F0F0E8',
      // Ink since Story 21.2 — which is exactly why the header may no longer
      // fall back to it: it would paint a near-black band above a coloured hero.
      primary: '#181824',
      textPrimary: '#181824',
      textSecondary: '#55555F',
      warning: '#181824'
    }
  })
}));

jest.mock('@/shared/toast', () => ({ showToast: jest.fn() }));

jest.mock('@/features/cards/components/CardDetails', () => ({
  CardDetails: (props: CardDetailsMockProps) => mockCardDetails(props)
}));

jest.mock('@/features/cards/hooks/useBrandLogo', () => ({
  useBrandLogo: (brandId: string | null) => mockUseBrandLogo(brandId)
}));

jest.mock('@/features/cards/hooks/useDeleteCard', () => ({
  useDeleteCard: () => ({ deleteCard: mockDeleteCard, isDeleting: false })
}));

jest.mock('@/features/cards/hooks/useTrackCardUsage', () => ({
  useTrackCardUsage: jest.fn()
}));

jest.mock('@/features/cards/hooks/useToggleFavorite', () => ({
  useToggleFavorite: () => ({ toggle: mockToggle, isPending: false })
}));

jest.mock('@/features/cards/hooks/useCardBrightnessBoost', () => ({
  useCardBrightnessBoost: jest.fn(() => ({ isBoosted: false, toggle: mockToggleBrightness }))
}));

const mockCard = {
  id: 'card-1',
  name: 'Test Card',
  barcode: '123456789',
  barcodeFormat: 'EAN13',
  color: '#FF0000',
  brandId: null,
  isFavorite: false
};

const detailsProps = () => mockCardDetails.mock.calls[mockCardDetails.mock.calls.length - 1]![0];

describe('CardDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'card-1' });
    (getCardById as jest.Mock).mockResolvedValue(mockCard);
    mockUseBrandLogo.mockReturnValue(undefined);
  });

  it('loads the card and renders CardDetails on success', async () => {
    render(<CardDetailScreen />);

    await waitFor(() =>
      expect(mockCardDetails).toHaveBeenCalledWith(expect.objectContaining({ card: mockCard }))
    );
    expect(getCardById).toHaveBeenCalledWith('card-1');
  });

  it('shows an invalid-id error when no id param is present', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});

    const { getByText } = render(<CardDetailScreen />);

    await waitFor(() => expect(getByText('cards.details.invalidId')).toBeTruthy());
    expect(getCardById).not.toHaveBeenCalled();
  });

  it('shows a not-found error when the card is missing', async () => {
    (getCardById as jest.Mock).mockResolvedValue(null);

    const { getByText } = render(<CardDetailScreen />);

    await waitFor(() => expect(getByText('cards.details.notFound')).toBeTruthy());
  });

  it('shows a load-failed error when the lookup throws', async () => {
    (getCardById as jest.Mock).mockRejectedValue(new Error('db error'));

    const { getByText } = render(<CardDetailScreen />);

    await waitFor(() => expect(getByText('cards.details.loadFailed')).toBeTruthy());
  });

  it('shows a copied toast when the barcode is copied', async () => {
    render(<CardDetailScreen />);
    await waitFor(() => expect(mockCardDetails).toHaveBeenCalled());

    detailsProps().onCopy();

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'cards.details.copiedToClipboard' })
    );
  });

  it('forwards deletion to the useDeleteCard hook', async () => {
    render(<CardDetailScreen />);
    await waitFor(() => expect(mockCardDetails).toHaveBeenCalled());

    detailsProps().onDelete();

    expect(mockDeleteCard).toHaveBeenCalledTimes(1);
  });

  it('condenses the header when scrolled past the hero', async () => {
    render(<CardDetailScreen />);
    await waitFor(() => expect(mockCardDetails).toHaveBeenCalled());

    act(() => detailsProps().onScrollPastHero(true));

    // Still rendering the details (re-rendered with condensed header state).
    expect(mockCardDetails).toHaveBeenCalledWith(expect.objectContaining({ card: mockCard }));
  });

  // Story 16.39. The hook is covered by its own suite; what these pin is the WIRING —
  // that the screen calls it and hands its state down to the button. A screen that
  // called the hook but never passed `onToggleBrightness` would render no button at
  // all, and no hook test could see that.
  it('runs the brightness boost hook and passes its state to CardDetails (Story 16.39)', async () => {
    render(<CardDetailScreen />);

    await waitFor(() => expect(mockCardDetails).toHaveBeenCalled());
    expect(useCardBrightnessBoost).toHaveBeenCalled();
    expect(detailsProps().isBrightnessBoosted).toBe(false);
    expect(detailsProps().onToggleBrightness).toBe(mockToggleBrightness);
  });

  it('reflects the boosted state down to CardDetails when it is on (Story 16.39)', async () => {
    (useCardBrightnessBoost as jest.Mock).mockReturnValue({
      isBoosted: true,
      toggle: mockToggleBrightness
    });

    render(<CardDetailScreen />);

    await waitFor(() => expect(mockCardDetails).toHaveBeenCalled());
    expect(detailsProps().isBrightnessBoosted).toBe(true);
  });

  it('runs the hook even when the card fails to load (Story 16.39)', async () => {
    // Deliberate: the hook is not gated on the card, so the boost decision is made
    // with the screen rather than after the database read. Asserted on the error path
    // because that is where a future `if (card)` guard would show up first.
    (getCardById as jest.Mock).mockResolvedValue(null);

    render(<CardDetailScreen />);

    await waitFor(() => expect(getCardById).toHaveBeenCalled());
    expect(useCardBrightnessBoost).toHaveBeenCalled();
  });

  it('uses the brand colour and favourite state in the header when present', async () => {
    const favouriteBrandedCard = { ...mockCard, isFavorite: true, brandId: 'brand-1' };
    (getCardById as jest.Mock).mockResolvedValue(favouriteBrandedCard);
    mockUseBrandLogo.mockReturnValue({ color: '#00AA00' });

    render(<CardDetailScreen />);

    await waitFor(() =>
      expect(mockCardDetails).toHaveBeenCalledWith(
        expect.objectContaining({ card: favouriteBrandedCard })
      )
    );
    expect(mockUseBrandLogo).toHaveBeenCalledWith('brand-1');
  });

  /**
   * Story 21.2 — AC7 and AC9.
   *
   * The header, the inset above it and the hero below it are meant to read as
   * ONE filled region in the card's own accent; three separately filled boxes
   * leave visible hairlines where they meet. `BrandHero` has always painted the
   * band `CARD_COLORS[card.color]`, while this header fell back to
   * `theme.primary` for a brandless card — invisible while primary was a blue
   * close to the old `CARD_COLORS.blue`, and a near-black band the moment
   * Story 21.2 made primary ink. These pin the fill itself, not the render.
   */
  describe('the header fill and the favourite star (Story 21.2)', () => {
    const headerBackground = (): string | undefined => {
      const options = mockScreenOptions.mock.calls.at(-1)?.[0] as ScreenProps['options'];
      return options?.headerStyle?.backgroundColor;
    };

    const starColour = (): string | undefined => {
      const options = mockScreenOptions.mock.calls.at(-1)?.[0] as ScreenProps['options'];
      const pressable = options?.headerRight?.() as {
        props: { children: { props: { color?: string; name?: string } } };
      };
      return pressable.props.children.props.color;
    };

    const starName = (): string | undefined => {
      const options = mockScreenOptions.mock.calls.at(-1)?.[0] as ScreenProps['options'];
      const pressable = options?.headerRight?.() as {
        props: { children: { props: { color?: string; name?: string } } };
      };
      return pressable.props.children.props.name;
    };

    it('fills the header with the brand hex for a catalogue card (AC7)', async () => {
      (getCardById as jest.Mock).mockResolvedValue({ ...mockCard, brandId: 'brand-1' });
      mockUseBrandLogo.mockReturnValue({ color: '#0082C3' });

      render(<CardDetailScreen />);

      await waitFor(() => expect(headerBackground()).toBe('#0082C3'));
    });

    it("fills it with the card's own accent for a brandless card, never theme.primary (AC7)", async () => {
      (getCardById as jest.Mock).mockResolvedValue({ ...mockCard, color: 'red' });

      render(<CardDetailScreen />);

      await waitFor(() => expect(headerBackground()).toBe('#E2231A'));
      expect(headerBackground()).not.toBe('#181824');
    });

    it('falls back to grey rather than transparent for an unmapped colour (AC7)', async () => {
      // `mockCard.color` is a raw hex, not one of the five keys, so the `??`
      // guard is the only thing between this card and an unfilled header.
      (getCardById as jest.Mock).mockResolvedValue(mockCard);

      render(<CardDetailScreen />);

      await waitFor(() => expect(headerBackground()).toBe('#64748B'));
    });

    it('draws a filled beam star on a dark field (AC9)', async () => {
      (getCardById as jest.Mock).mockResolvedValue({
        ...mockCard,
        isFavorite: true,
        brandId: 'brand-1'
      });
      mockUseBrandLogo.mockReturnValue({ color: '#004E9F' });

      render(<CardDetailScreen />);

      await waitFor(() => expect(starColour()).toBe('#FCCC0C'));
      expect(starName()).toBe('star');
    });

    it('drops the star to ink on a light field, so Esselunga does not swallow it (AC9)', async () => {
      (getCardById as jest.Mock).mockResolvedValue({
        ...mockCard,
        isFavorite: true,
        brandId: 'esselunga'
      });
      mockUseBrandLogo.mockReturnValue({ color: '#FFCC00' });

      render(<CardDetailScreen />);

      await waitFor(() => expect(starColour()).toBe('#181824'));
    });

    it('keeps the unfavourited star an outline in the header foreground (AC9)', async () => {
      (getCardById as jest.Mock).mockResolvedValue({ ...mockCard, brandId: 'brand-1' });
      mockUseBrandLogo.mockReturnValue({ color: '#004E9F' });

      render(<CardDetailScreen />);

      await waitFor(() => expect(starName()).toBe('star-border'));
      expect(starColour()).toBe('#FFFFFF');
    });
  });
});
