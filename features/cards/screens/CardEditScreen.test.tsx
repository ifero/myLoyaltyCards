/**
 * Edit Card Screen Tests
 * Story 2.7 (screen); relocated + covered under Story 16.9.
 *
 * Added when the screen moved from app/card/[id]/edit.tsx into
 * features/cards/screens/ (Story 16.9). Behaviour is unchanged; app/ is
 * excluded from coverage, so the move surfaced a previously-unmeasured screen.
 */

import { render, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { Alert, BackHandler } from 'react-native';

import { getCardById } from '@/core/database';

import CardEditScreen from './CardEditScreen';

type CardFormMockProps = {
  defaultValues: { name: string; barcode: string; barcodeFormat: string; color: string };
  onSubmit: (data: unknown) => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
};

const mockBack = jest.fn();
const mockEditCard = jest.fn().mockResolvedValue(undefined);
const mockCardForm = jest.fn((props: CardFormMockProps) => {
  void props;
  return null;
});

jest.mock('expo-router', () => {
  const Stack = () => null;
  (Stack as { Screen?: () => null }).Screen = () => null;
  return {
    Stack,
    useLocalSearchParams: jest.fn(),
    useRouter: () => ({ back: mockBack })
  };
});

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
    theme: { background: '#FFFFFF', primary: '#1A73E8', textPrimary: '#000', textSecondary: '#666' }
  })
}));

jest.mock('@/features/cards/components/CardForm', () => ({
  CardForm: (props: CardFormMockProps) => mockCardForm(props)
}));

jest.mock('@/features/cards/hooks/useEditCard', () => ({
  useEditCard: () => ({ editCard: mockEditCard, isLoading: false })
}));

type BackHandlerFn = () => boolean | null | undefined;

const mockCard = {
  id: 'card-1',
  name: 'Test Card',
  barcode: '123456789',
  barcodeFormat: 'EAN13',
  color: '#FF0000'
};

const formProps = () => mockCardForm.mock.calls[mockCardForm.mock.calls.length - 1]![0];

describe('CardEditScreen', () => {
  let capturedBackHandler: BackHandlerFn | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedBackHandler = undefined;
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'card-1' });
    (getCardById as jest.Mock).mockResolvedValue(mockCard);
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
      capturedBackHandler = handler;
      return { remove: jest.fn() } as ReturnType<typeof BackHandler.addEventListener>;
    });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads the card and renders the form with its values', async () => {
    render(<CardEditScreen />);

    await waitFor(() => {
      expect(mockCardForm).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultValues: expect.objectContaining({ name: 'Test Card', barcode: '123456789' })
        })
      );
    });
    expect(getCardById).toHaveBeenCalledWith('card-1');
  });

  it('shows an invalid-id error when no id param is present', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});

    const { getByText } = render(<CardEditScreen />);

    await waitFor(() => expect(getByText('cards.edit.invalidId')).toBeTruthy());
    expect(getCardById).not.toHaveBeenCalled();
  });

  it('shows a not-found error when the card is missing', async () => {
    (getCardById as jest.Mock).mockResolvedValue(null);

    const { getByText } = render(<CardEditScreen />);

    await waitFor(() => expect(getByText('cards.edit.notFound')).toBeTruthy());
  });

  it('shows a load-failed error when the lookup throws', async () => {
    (getCardById as jest.Mock).mockRejectedValue(new Error('db error'));

    const { getByText } = render(<CardEditScreen />);

    await waitFor(() => expect(getByText('cards.edit.loadFailed')).toBeTruthy());
  });

  it('submits edits through the editCard hook', async () => {
    render(<CardEditScreen />);
    await waitFor(() => expect(mockCardForm).toHaveBeenCalled());

    await formProps().onSubmit({
      name: 'Updated',
      barcode: '999',
      barcodeFormat: 'EAN13',
      color: '#000'
    });

    expect(mockEditCard).toHaveBeenCalledWith('card-1', {
      name: 'Updated',
      barcode: '999',
      barcodeFormat: 'EAN13',
      color: '#000'
    });
  });

  it('lets the hardware back button pass through when the form is pristine', async () => {
    render(<CardEditScreen />);
    await waitFor(() => expect(capturedBackHandler).toBeDefined());

    expect(capturedBackHandler!()).toBe(false);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('intercepts hardware back and confirms discard when the form is dirty', async () => {
    render(<CardEditScreen />);
    await waitFor(() => expect(mockCardForm).toHaveBeenCalled());

    formProps().onDirtyChange(true);

    expect(capturedBackHandler!()).toBe(true);
    expect(Alert.alert).toHaveBeenCalledTimes(1);

    // Invoke the "discard" button's onPress → navigates back.
    const buttons = (Alert.alert as jest.Mock).mock.calls[0]![2] as Array<{
      onPress?: () => void;
    }>;
    buttons[1]!.onPress?.();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
