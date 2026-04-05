/**
 * BrandSearchBar Component Tests
 * Story 13.4: Restyle Add Card Flow (AC1, AC2)
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import { BrandSearchBar } from './BrandSearchBar';

const mockTheme = {
  surfaceElevated: '#F5F5F5',
  border: '#E5E5EB',
  textPrimary: '#1F1F24',
  textSecondary: '#66666B',
  textTertiary: '#8F8F94'
};

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({ theme: mockTheme, isDark: false })
}));

describe('BrandSearchBar', () => {
  const defaultProps = {
    value: '',
    onChangeText: jest.fn(),
    onClear: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders search icon', () => {
      render(<BrandSearchBar {...defaultProps} />);
      expect(screen.getByText('search')).toBeTruthy();
    });

    it('renders input with placeholder', () => {
      render(<BrandSearchBar {...defaultProps} />);
      const input = screen.getByTestId('brand-search-bar-input');
      expect(input.props.placeholder).toBe('Search by name');
    });

    it('does NOT show clear button when value is empty', () => {
      render(<BrandSearchBar {...defaultProps} />);
      expect(screen.queryByTestId('brand-search-bar-clear')).toBeNull();
    });

    it('shows clear button when value is non-empty', () => {
      render(<BrandSearchBar {...defaultProps} value="test" />);
      expect(screen.getByTestId('brand-search-bar-clear')).toBeTruthy();
    });

    it('renders with custom testID', () => {
      render(<BrandSearchBar {...defaultProps} testID="custom-bar" />);
      expect(screen.getByTestId('custom-bar')).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('calls onChangeText when typing', () => {
      const onChangeText = jest.fn();
      render(<BrandSearchBar {...defaultProps} onChangeText={onChangeText} />);
      fireEvent.changeText(screen.getByTestId('brand-search-bar-input'), 'ess');
      expect(onChangeText).toHaveBeenCalledWith('ess');
    });

    it('calls onClear when clear button is pressed', () => {
      const onClear = jest.fn();
      render(<BrandSearchBar {...defaultProps} value="test" onClear={onClear} />);
      fireEvent.press(screen.getByTestId('brand-search-bar-clear'));
      expect(onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('has search accessibility role on input', () => {
      render(<BrandSearchBar {...defaultProps} />);
      const input = screen.getByTestId('brand-search-bar-input');
      expect(input.props.accessibilityRole).toBe('search');
    });

    it('has accessibility label on clear button', () => {
      render(<BrandSearchBar {...defaultProps} value="test" />);
      const clearBtn = screen.getByTestId('brand-search-bar-clear');
      expect(clearBtn.props.accessibilityLabel).toBe('Clear search');
    });
  });
});
