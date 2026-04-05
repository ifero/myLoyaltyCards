/**
 * BrandHero Component Tests
 * Story 13.3: Restyle Card Detail Screen (AC1)
 */

import { render } from '@testing-library/react-native';
import React from 'react';

import { LoyaltyCard } from '@/core/schemas';

import { BrandHero } from './BrandHero';

// Mock theme
jest.mock('@/shared/theme/colors', () => ({
  CARD_COLORS: {
    blue: '#1A73E8',
    red: '#E2231A',
    green: '#16A34A',
    orange: '#F59E0B',
    grey: '#64748B'
  }
}));

// Mock useBrandLogo
const mockUseBrandLogo = jest.fn();
jest.mock('../hooks/useBrandLogo', () => ({
  useBrandLogo: (...args: unknown[]) => mockUseBrandLogo(...args)
}));

// Mock brandLogos
const MockLogoComponent = ({ width, height }: { width: number; height: number }) =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react').createElement('View', { testID: 'mock-svg-logo', style: { width, height } });

jest.mock('../utils/brandLogos', () => ({
  getBrandLogoComponent: jest.fn(() => MockLogoComponent)
}));

const mockCustomCard: LoyaltyCard = {
  id: 'custom-1',
  name: 'Gym Pass',
  barcode: '1234567890',
  barcodeFormat: 'CODE128',
  brandId: null,
  color: 'blue',
  isFavorite: false,
  lastUsedAt: null,
  usageCount: 0,
  createdAt: '2026-01-07T10:00:00Z',
  updatedAt: '2026-01-07T10:00:00Z'
};

const mockCatalogueCard: LoyaltyCard = {
  id: 'catalogue-1',
  name: 'Conad',
  barcode: '9876543210',
  barcodeFormat: 'EAN13',
  brandId: 'conad',
  color: 'red',
  isFavorite: false,
  lastUsedAt: null,
  usageCount: 0,
  createdAt: '2026-02-15T12:00:00Z',
  updatedAt: '2026-02-15T12:00:00Z'
};

describe('BrandHero', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Custom card variant', () => {
    beforeEach(() => {
      mockUseBrandLogo.mockReturnValue(undefined);
    });

    it('renders correctly', () => {
      const { getByTestId } = render(<BrandHero card={mockCustomCard} testID="hero" />);
      expect(getByTestId('hero')).toBeTruthy();
    });

    it('renders avatar for custom cards', () => {
      const { getByTestId } = render(<BrandHero card={mockCustomCard} testID="hero" />);
      expect(getByTestId('hero-avatar')).toBeTruthy();
    });

    it('shows first letter of card name', () => {
      const { getByText } = render(<BrandHero card={mockCustomCard} testID="hero" />);
      expect(getByText('G')).toBeTruthy(); // "Gym Pass" → "G"
    });

    it('displays card name', () => {
      const { getByTestId } = render(<BrandHero card={mockCustomCard} testID="hero" />);
      const nameEl = getByTestId('hero-name');
      expect(nameEl.props.children).toBe('Gym Pass');
    });

    it('uses user-selected card color as background', () => {
      const { getByTestId } = render(<BrandHero card={mockCustomCard} testID="hero" />);
      const container = getByTestId('hero');
      const flatStyle = Array.isArray(container.props.style)
        ? Object.assign({}, ...container.props.style)
        : container.props.style;
      expect(flatStyle.backgroundColor).toBe('#1A73E8');
    });
  });

  describe('Catalogue card variant', () => {
    beforeEach(() => {
      mockUseBrandLogo.mockReturnValue({
        id: 'conad',
        name: 'Conad',
        aliases: [],
        logo: 'conad',
        color: '#E2231A'
      });
    });

    it('renders correctly', () => {
      const { getByTestId } = render(<BrandHero card={mockCatalogueCard} testID="hero" />);
      expect(getByTestId('hero')).toBeTruthy();
    });

    it('renders logo slot for catalogue cards', () => {
      const { getByTestId } = render(<BrandHero card={mockCatalogueCard} testID="hero" />);
      expect(getByTestId('hero-logo-slot')).toBeTruthy();
    });

    it('does not render avatar for catalogue cards', () => {
      const { queryByTestId } = render(<BrandHero card={mockCatalogueCard} testID="hero" />);
      expect(queryByTestId('hero-avatar')).toBeNull();
    });

    it('displays brand name', () => {
      const { getByTestId } = render(<BrandHero card={mockCatalogueCard} testID="hero" />);
      const nameEl = getByTestId('hero-name');
      expect(nameEl.props.children).toBe('Conad');
    });

    it('uses brand color as background', () => {
      const { getByTestId } = render(<BrandHero card={mockCatalogueCard} testID="hero" />);
      const container = getByTestId('hero');
      const flatStyle = Array.isArray(container.props.style)
        ? Object.assign({}, ...container.props.style)
        : container.props.style;
      expect(flatStyle.backgroundColor).toBe('#E2231A');
    });
  });

  describe('Dark mode resilience', () => {
    it('brand colors remain the same regardless of theme', () => {
      mockUseBrandLogo.mockReturnValue({
        id: 'conad',
        name: 'Conad',
        aliases: [],
        logo: 'conad',
        color: '#E2231A'
      });

      const { getByTestId } = render(<BrandHero card={mockCatalogueCard} testID="hero" />);
      const container = getByTestId('hero');
      // Brand color is from brand data, not from theme
      const flatStyle = Array.isArray(container.props.style)
        ? Object.assign({}, ...container.props.style)
        : container.props.style;
      expect(flatStyle.backgroundColor).toBe('#E2231A');
    });
  });
});
