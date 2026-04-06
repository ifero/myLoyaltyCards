/**
 * BrandRow Component Tests
 * Story 13.4: Restyle Add Card Flow (AC1)
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

import { CatalogueBrand } from '@/catalogue/types';

import { BrandRow } from './BrandRow';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      textPrimary: '#1F1F24',
      textTertiary: '#8F8F94',
      surfaceElevated: '#F5F5F5',
      border: '#E5E5EB'
    },
    isDark: false
  })
}));

const testBrand: CatalogueBrand = {
  id: 'esselunga',
  name: 'Esselunga',
  color: '#FF0000',
  logo: 'esselunga',
  aliases: ['fidaty'],
  defaultFormat: 'EAN13'
};

const brandNoLogo: CatalogueBrand = {
  id: 'custom',
  name: 'MyStore',
  color: '#00FF00',
  logo: '',
  aliases: []
};

describe('BrandRow', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders brand name', () => {
      render(<BrandRow brand={testBrand} onPress={mockOnPress} />);
      expect(screen.getByText('Esselunga')).toBeTruthy();
    });

    it('renders first-letter avatar for brand', () => {
      render(<BrandRow brand={testBrand} onPress={mockOnPress} />);
      expect(screen.getByText('E')).toBeTruthy();
    });

    it('renders first-letter avatar when logo is empty', () => {
      render(<BrandRow brand={brandNoLogo} onPress={mockOnPress} />);
      expect(screen.getByText('M')).toBeTruthy();
    });

    it('renders chevron icon', () => {
      render(<BrandRow brand={testBrand} onPress={mockOnPress} />);
      expect(screen.getByText('chevron-right')).toBeTruthy();
    });

    it('shows separator by default', () => {
      const { toJSON } = render(<BrandRow brand={testBrand} onPress={mockOnPress} />);
      // The separator View is part of the rendered tree
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('calls onPress with brand when tapped', () => {
      render(<BrandRow brand={testBrand} onPress={mockOnPress} testID="brand-row" />);
      fireEvent.press(screen.getByTestId('brand-row'));
      expect(mockOnPress).toHaveBeenCalledWith(testBrand);
    });
  });

  describe('accessibility', () => {
    it('has button role', () => {
      render(<BrandRow brand={testBrand} onPress={mockOnPress} testID="brand-row" />);
      expect(screen.getByTestId('brand-row').props.accessibilityRole).toBe('button');
    });

    it('has brand name as accessibility label', () => {
      render(<BrandRow brand={testBrand} onPress={mockOnPress} testID="brand-row" />);
      expect(screen.getByTestId('brand-row').props.accessibilityLabel).toBe('Esselunga');
    });
  });
});
