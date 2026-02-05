/**
 * Add Card Screen Tests
 * Story 3.2: Browse Catalogue Grid
 */

import { render } from '@testing-library/react-native';

import AddCardScreen from '../add-card';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn()
  }),
  useLocalSearchParams: () => ({}),
  useNavigation: () => ({
    addListener: jest.fn(() => jest.fn())
  }),
  useFocusEffect: jest.fn()
}));

// Mock hooks
jest.mock('@/features/cards/hooks/useAddCard', () => ({
  useAddCard: () => ({
    addCard: jest.fn(),
    isLoading: false
  })
}));

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      background: '#FFFFFF',
      primary: '#007AFF',
      text: '#000000',
      textSecondary: '#666666'
    }
  }),
  SEMANTIC_COLORS: {
    success: '#34C759'
  },
  CARD_COLORS: {
    blue: '#3B82F6',
    red: '#EF4444',
    green: '#22C55E',
    orange: '#F97316',
    grey: '#6B7280'
  }
}));

describe('AddCardScreen - Story 3.2: Catalogue Grid', () => {
  it('should render CatalogueGrid by default', () => {
    const { getByTestId } = render(<AddCardScreen />);

    // AC: The default view is the Catalogue Grid
    expect(getByTestId('catalogue-grid')).toBeTruthy();
  });

  it('should render "Add Custom Card" button', () => {
    const { getByTestId } = render(<AddCardScreen />);

    // AC: Prominent "Add Custom Card" button for manual entry/scan flow
    expect(getByTestId('add-custom-card-button')).toBeTruthy();
  });

  it('should not render CardForm by default', () => {
    const { queryByTestId } = render(<AddCardScreen />);

    // CardForm should not be visible by default
    expect(queryByTestId('add-card-form')).toBeNull();
  });
});
