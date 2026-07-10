/**
 * Barcode Flash Screen Tests
 * Story 2.5 (screen); relocated + covered under Story 16.9.
 *
 * These tests were added when the screen moved from app/barcode/[id].tsx into
 * features/cards/screens/ (Story 16.9): app/ is excluded from coverage, so the
 * relocation surfaced a previously-unmeasured screen. Behaviour is unchanged.
 */

import { render, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

import { getCardById } from '@/core/database';

import BarcodeScreen from './BarcodeScreen';

const mockBack = jest.fn();
const mockBarcodeFlash = jest.fn((props: { card: unknown; onDismiss: () => void }) => {
  void props;
  return null;
});

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: () => ({ back: mockBack })
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

jest.mock('@/core/database', () => ({
  getCardById: jest.fn()
}));

jest.mock('@/core/utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() }
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

  it('dismisses via router.back when BarcodeFlash requests it', async () => {
    render(<BarcodeScreen />);

    await waitFor(() => expect(mockBarcodeFlash).toHaveBeenCalled());
    mockBarcodeFlash.mock.calls[0]![0].onDismiss();

    expect(mockBack).toHaveBeenCalledTimes(1);
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

  it('dismisses from the error state', async () => {
    (getCardById as jest.Mock).mockResolvedValue(null);

    const { getByText } = render(<BarcodeScreen />);

    const dismiss = await waitFor(() => getByText('auth.verifyEmail.goBack'));
    dismiss.props.onPress();

    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
