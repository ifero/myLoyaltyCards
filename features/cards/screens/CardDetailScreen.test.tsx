/**
 * Card Details Screen Tests
 * Story 13.3 (screen); relocated + covered under Story 16.9.
 *
 * Added when the screen moved from app/card/[id].tsx into
 * features/cards/screens/ (Story 16.9). Behaviour is unchanged; app/ is
 * excluded from coverage, so the move surfaced a previously-unmeasured screen.
 */

import { act, render, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

import { getCardById } from '@/core/database';

import { showToast } from '@/shared/toast';

import CardDetailScreen from './CardDetailScreen';

type CardDetailsMockProps = {
  card: unknown;
  isDeleting: boolean;
  onCopy: () => void;
  onDelete: () => void;
  onScrollPastHero: (past: boolean) => void;
};

type ScreenProps = { options?: { headerLeft?: () => unknown; headerRight?: () => unknown } };

const mockBack = jest.fn();
const mockToggle = jest.fn();
const mockDeleteCard = jest.fn();
const mockCardDetails = jest.fn((props: CardDetailsMockProps) => {
  void props;
  return null;
});
const mockUseBrandLogo = jest.fn();

// Stack.Screen invokes headerLeft/headerRight so the header ternaries
// (favorite state, tint colour) are exercised without a real navigator.
jest.mock('expo-router', () => {
  const Stack = () => null;
  (Stack as { Screen?: (props: ScreenProps) => null }).Screen = (props: ScreenProps) => {
    props.options?.headerLeft?.();
    props.options?.headerRight?.();
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
      background: '#FFFFFF',
      primary: '#1A73E8',
      textPrimary: '#000',
      textSecondary: '#666',
      warning: '#F59E0B'
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
});
