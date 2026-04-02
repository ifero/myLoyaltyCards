/**
 * SearchBar Component Tests
 * Story 13.2: Restyle Home Screen — AC3
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import { SearchBar } from './SearchBar';

const mockTheme = {
  primary: '#1A73E8',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8'
};

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: mockTheme,
    isDark: false
  })
}));

describe('SearchBar', () => {
  const defaultProps = {
    value: '',
    onChangeText: jest.fn(),
    onClear: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders search icon and input', () => {
      render(<SearchBar {...defaultProps} />);

      expect(screen.getByText('search')).toBeTruthy();
      expect(screen.getByTestId('search-bar-input')).toBeTruthy();
    });

    it('shows placeholder text', () => {
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByTestId('search-bar-input');
      expect(input.props.placeholder).toBe('Search loyalty cards');
    });

    it('does NOT show clear button when value is empty', () => {
      render(<SearchBar {...defaultProps} />);

      expect(screen.queryByTestId('search-bar-clear')).toBeNull();
    });

    it('shows clear button when value is non-empty', () => {
      render(<SearchBar {...defaultProps} value="test" />);

      expect(screen.getByTestId('search-bar-clear')).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('calls onChangeText when typing', () => {
      const onChangeText = jest.fn();
      render(<SearchBar {...defaultProps} onChangeText={onChangeText} />);

      const input = screen.getByTestId('search-bar-input');
      fireEvent.changeText(input, 'ess');

      expect(onChangeText).toHaveBeenCalledWith('ess');
    });

    it('calls onClear when clear button is pressed', () => {
      const onClear = jest.fn();
      render(<SearchBar {...defaultProps} value="test" onClear={onClear} />);

      const clearBtn = screen.getByTestId('search-bar-clear');
      fireEvent.press(clearBtn);

      expect(onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('has correct accessibility label on input', () => {
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByLabelText('Search loyalty cards');
      expect(input).toBeTruthy();
    });

    it('clear button has correct accessibility attributes', () => {
      render(<SearchBar {...defaultProps} value="test" />);

      const clearBtn = screen.getByLabelText('Clear search');
      expect(clearBtn).toBeTruthy();
      expect(clearBtn.props.accessibilityRole).toBe('button');
    });
  });

  describe('active state styling', () => {
    it('has border when value is non-empty (active state)', () => {
      render(<SearchBar {...defaultProps} value="test" />);

      const container = screen.getByTestId('search-bar');
      const flatStyle = Object.assign({}, ...container.props.style);
      expect(flatStyle.borderWidth).toBe(1);
      expect(flatStyle.borderColor).toBe('#1A73E8');
    });

    it('has no border when value is empty', () => {
      render(<SearchBar {...defaultProps} />);

      const container = screen.getByTestId('search-bar');
      const flatStyle = Object.assign({}, ...container.props.style);
      expect(flatStyle.borderWidth).toBe(0);
    });
  });
});
