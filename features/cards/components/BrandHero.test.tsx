/**
 * BrandHero Component Tests
 * Story 13.3: Restyle Card Detail Screen (AC1)
 */

import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { LoyaltyCard } from '@/core/schemas';

import { BrandHero } from './BrandHero';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({ isDark: false })
}));

// Mock theme
jest.mock('@/shared/theme/colors', () => ({
  CARD_COLORS: {
    blue: '#0C3C84',
    red: '#E42424',
    green: '#0C843C',
    orange: '#FCCC0C',
    grey: '#0C84CC'
  },
  // ⚠️ Must be listed, and must agree with `grey` above. A jest module mock replaces
  // the module WHOLESALE, so an export left out is `undefined` at the call site — and
  // for a fallback that means the guarded path CRASHES in getLuminance rather than
  // falling back. Adding Story 21.2a's fallback tests is what surfaced this.
  DEFAULT_CARD_COLOR_HEX: '#0C84CC'
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
  getBrandLogo: jest.fn(() => MockLogoComponent)
}));

jest.mock('./BrandLogo', () => ({
  BrandLogo: ({ source, width, height }: { source: unknown; width: number; height: number }) =>
    typeof source === 'function' ? source({ width, height }) : null
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
      // The Cardì deep blue (Story 21.2a). The brand-colour assertions below use
      // `#E2231A` — Coop's catalogue hex, which the retired card red happened to
      // share. They are brand data and do not move with the palette. (The mock
      // labels that brand `conad`, which is wrong — Conad is `#DA291C` — but the
      // mock is self-consistent, so it is left alone here.)
      expect(flatStyle.backgroundColor).toBe('#0C3C84');
    });
  });

  /**
   * Story 21.2a, AC4 — the `??` guard at both of this file's fallback sites.
   *
   * AC4's own warning is that removing the guard renders the field TRANSPARENT rather
   * than recoloured, and neither site had a test. `card.color` is not guaranteed to be
   * one of the five keys at runtime: `card-repository.ts` reads `row.color as CardColor`
   * with no validation, so a legacy or corrupted row arrives here unchecked.
   */
  describe('unresolvable colours fall back to the default accent (AC4)', () => {
    const flatBackground = (testID: string) => {
      const container = screen.getByTestId(testID);
      const style = Array.isArray(container.props.style)
        ? Object.assign({}, ...container.props.style)
        : container.props.style;
      return style.backgroundColor as string | undefined;
    };

    it('paints the default accent for a custom card whose colour is not a palette key', () => {
      render(<BrandHero card={{ ...mockCustomCard, color: '#DEADBE' as never }} testID="hero" />);

      expect(flatBackground('hero')).toBe('#0C84CC');
      expect(flatBackground('hero')).not.toBeUndefined();
    });

    it('paints the default accent for a catalogue card whose brand has no colour', () => {
      mockUseBrandLogo.mockReturnValue({
        id: 'conad',
        name: 'Conad',
        aliases: [],
        logo: 'conad',
        color: undefined as unknown as string
      });

      render(<BrandHero card={mockCatalogueCard} testID="hero" />);

      expect(flatBackground('hero')).toBe('#0C84CC');
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
