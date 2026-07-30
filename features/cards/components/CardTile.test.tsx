/**
 * CardTile Component Tests
 * Story 13.2: Restyle Home Screen — AC1, AC7, AC9
 * Story 16.22: Fix card-grid tile overlap — AC1, AC5, AC9 (tileWidth/tileHeight props)
 */

import { render, screen, fireEvent } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { LoyaltyCard } from '@/core/schemas';

import {
  CardTile,
  TILE_WIDTH,
  TILE_HEIGHT,
  TILE_RADIUS,
  SINGLE_TILE_WIDTH,
  SINGLE_TILE_HEIGHT,
  SINGLE_TILE_RADIUS
} from './CardTile';

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: jest.fn()
}));

// Mock ThemeProvider
jest.mock('@/shared/theme', () => ({
  useTheme: jest.fn()
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useTheme } = require('@/shared/theme');

// Mock CARD_COLORS
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
jest.mock('../hooks/useBrandLogo', () => ({
  useBrandLogo: jest.fn()
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useBrandLogo } = require('../hooks/useBrandLogo');

jest.mock('../utils/brandLogos', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  const MockLogo = (props: Record<string, unknown>) =>
    React.createElement(View, { ...props, testID: 'brand-logo-svg' });
  return {
    getBrandLogo: jest.fn(() => MockLogo)
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getBrandLogo } = require('../utils/brandLogos');

jest.mock('./BrandLogo', () => ({
  BrandLogo: ({ source, width, height }: { source: unknown; width: number; height: number }) =>
    typeof source === 'function' ? source({ width, height }) : null
}));

describe('CardTile', () => {
  const mockCard: LoyaltyCard = {
    id: '1',
    name: 'Test Store',
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

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useTheme as jest.Mock).mockReturnValue({
      theme: {
        primary: '#1A73E8',
        surface: '#FFFFFF',
        textPrimary: '#1F1F24',
        textSecondary: '#66666B',
        border: '#E5E5EB',
        borderStrong: '#8F8F94',
        surfaceElevated: '#F5F5F5',
        warning: '#D97706'
      },
      isDark: false
    });
    (useBrandLogo as jest.Mock).mockReturnValue(undefined);
  });

  describe('Custom card rendering (no brandId)', () => {
    it('renders card name below tile', () => {
      render(<CardTile card={mockCard} />);
      expect(screen.getByText('Test Store')).toBeTruthy();
    });

    it('renders first-letter avatar for custom cards', () => {
      render(<CardTile card={mockCard} />);
      expect(screen.getByText('T')).toBeTruthy();
    });

    it('uses card color as tile background', () => {
      const { toJSON } = render(<CardTile card={mockCard} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Catalogue card rendering (with brandId)', () => {
    const brandCard: LoyaltyCard = { ...mockCard, brandId: 'esselunga' };

    beforeEach(() => {
      (useBrandLogo as jest.Mock).mockReturnValue({
        id: 'esselunga',
        name: 'Esselunga',
        color: '#DB1F26',
        logo: 'esselunga',
        aliases: []
      });
    });

    it('renders SVG logo for catalogue cards with brand logo', () => {
      render(<CardTile card={brandCard} />);
      expect(screen.getByTestId('brand-logo-svg')).toBeTruthy();
    });
  });

  describe('Tile dimensions', () => {
    it('exports correct grid tile dimensions', () => {
      expect(TILE_WIDTH).toBe(171);
      expect(TILE_HEIGHT).toBe(140);
      expect(TILE_RADIUS).toBe(16);
    });

    it('exports correct single-card tile dimensions', () => {
      expect(SINGLE_TILE_WIDTH).toBe(220);
      expect(SINGLE_TILE_HEIGHT).toBe(180);
      expect(SINGLE_TILE_RADIUS).toBe(20);
    });
  });

  // ── Viewport-derived dimensions — Story 16.22 (AC1, AC5, AC9) ──
  describe('Applied tile dimensions — Story 16.22', () => {
    /** Flattened style of the tile shell (the Animated.View, not the name below it). */
    const tileStyle = (element: React.ReactElement) => {
      const { UNSAFE_getByType } = render(element);
      return StyleSheet.flatten(UNSAFE_getByType(Animated.View).props.style) as {
        width?: number;
        height?: number;
        borderRadius?: number;
      };
    };

    it('applies an explicit tileWidth/tileHeight to the tile shell', () => {
      // 360 dp — the most common Android portrait width, where the old fixed 171 overlapped.
      const style = tileStyle(<CardTile card={mockCard} tileWidth={156} tileHeight={128} />);
      expect(style.width).toBe(156);
      expect(style.height).toBe(128);
    });

    it('falls back to the design reference constants when no size props are given', () => {
      const style = tileStyle(<CardTile card={mockCard} />);
      expect(style.width).toBe(TILE_WIDTH);
      expect(style.height).toBe(TILE_HEIGHT);
    });

    it('falls back to the enlarged constants for a single card with no size props', () => {
      const style = tileStyle(<CardTile card={mockCard} enlarged />);
      expect(style.width).toBe(SINGLE_TILE_WIDTH);
      expect(style.height).toBe(SINGLE_TILE_HEIGHT);
    });

    it('lets explicit size props override the enlarged constants', () => {
      const style = tileStyle(
        <CardTile card={mockCard} enlarged tileWidth={208} tileHeight={170} />
      );
      expect(style.width).toBe(208);
      expect(style.height).toBe(170);
    });

    it('keeps the corner radius fixed when the tile shrinks (AC5)', () => {
      expect(
        tileStyle(<CardTile card={mockCard} tileWidth={136} tileHeight={111} />).borderRadius
      ).toBe(TILE_RADIUS);
      expect(
        tileStyle(<CardTile card={mockCard} enlarged tileWidth={188} tileHeight={154} />)
          .borderRadius
      ).toBe(SINGLE_TILE_RADIUS);
    });

    it('derives the brand logo size from the applied tile size, not the constants', () => {
      const brandCard: LoyaltyCard = { ...mockCard, brandId: 'esselunga' };
      (useBrandLogo as jest.Mock).mockReturnValue({
        id: 'esselunga',
        name: 'Esselunga',
        color: '#DB1F26',
        logo: 'esselunga',
        aliases: []
      });

      render(<CardTile card={brandCard} tileWidth={156} tileHeight={128} />);
      const logo = screen.getByTestId('brand-logo-svg');
      expect(logo.props.width).toBe(Math.round(156 * 0.85));
      expect(logo.props.height).toBe(Math.round(128 * 0.85));
    });

    /**
     * The tile's fallback children (`logoSlot`, `avatarCircle`) are FIXED sizes and are
     * centre-aligned, while `favouriteBadge` is pinned to the right edge. Before this
     * story the tile never went below 171 pt, so they could never meet. Now that the
     * tile tracks the viewport there is a width at which the centred fallback reaches
     * the badge, so the clearance is asserted rather than assumed.
     *
     * At 136 pt (the tile at 320 dp, the narrowest width AC7 exercises) the abbreviation
     * slot clears the badge by 6 pt. The collision point is ~124 pt of tile, i.e. a
     * ~296 dp viewport — below every real device. It matters mainly as a floor for any
     * future change that shrinks the tile further, a 3-column grid above all.
     */
    describe('fallback children clear the favourite badge', () => {
      const NARROWEST_SUPPORTED_TILE_WIDTH = 136;

      /** Right-pinned badge: its left edge is tileWidth − (right + width). */
      const badgeLeftEdge = (tileWidth: number, element: React.ReactElement) => {
        render(element);
        const badge = StyleSheet.flatten(screen.getByTestId('favourite-badge').props.style) as {
          right?: number;
          width?: number;
        };
        expect(badge.right).toBeDefined();
        expect(badge.width).toBeDefined();
        return tileWidth - (badge.right! + badge.width!);
      };

      /**
       * Width of the nearest styled ancestor of a text node — the fallback container
       * that holds it. Walks up rather than assuming a depth, because RNTL interposes
       * composite elements that carry no style of their own.
       */
      const enclosingWidth = (text: string): number | undefined => {
        let node = screen.getByText(text).parent;
        while (node) {
          const style = StyleSheet.flatten(node.props?.style) as { width?: number } | undefined;
          if (typeof style?.width === 'number') return style.width;
          node = node.parent;
        }
        return undefined;
      };

      it('keeps the brand-abbreviation slot clear of the badge at 320 dp', () => {
        // Catalogue brand whose SVG asset is missing → the abbreviation-slot branch.
        (useBrandLogo as jest.Mock).mockReturnValue({
          id: 'esselunga',
          name: 'Esselunga',
          color: '#DB1F26',
          logo: 'esselunga',
          aliases: []
        });
        (getBrandLogo as jest.Mock).mockReturnValue(undefined);

        const left = badgeLeftEdge(
          NARROWEST_SUPPORTED_TILE_WIDTH,
          <CardTile
            card={{ ...mockCard, brandId: 'esselunga', isFavorite: true }}
            tileWidth={NARROWEST_SUPPORTED_TILE_WIDTH}
            tileHeight={111}
          />
        );
        const slotWidth = enclosingWidth('ES');
        expect(slotWidth).toBeDefined();

        // Centred child, so its right edge is tileWidth / 2 + width / 2.
        const slotRightEdge = NARROWEST_SUPPORTED_TILE_WIDTH / 2 + slotWidth! / 2;
        expect(slotRightEdge).toBeLessThan(left);
      });

      it('keeps the first-letter avatar clear of the badge at 320 dp', () => {
        (useBrandLogo as jest.Mock).mockReturnValue(undefined);

        const left = badgeLeftEdge(
          NARROWEST_SUPPORTED_TILE_WIDTH,
          <CardTile
            card={{ ...mockCard, isFavorite: true }}
            tileWidth={NARROWEST_SUPPORTED_TILE_WIDTH}
            tileHeight={111}
          />
        );
        const avatarWidth = enclosingWidth('T');
        expect(avatarWidth).toBeDefined();

        const avatarRightEdge = NARROWEST_SUPPORTED_TILE_WIDTH / 2 + avatarWidth! / 2;
        expect(avatarRightEdge).toBeLessThan(left);
      });
    });

    it('keeps single-line tail ellipsis for the name regardless of tile size', () => {
      // Deliberately NOT a claim about *where* truncation falls — RNTL runs no flex
      // layout, so no unit test can observe that. What this pins is that passing a size
      // prop doesn't disturb the name's truncation contract: still one line, still
      // native tail ellipsis, at the narrow tile as at the reference tile.
      //
      // The real consequence — the name gets 136 pt instead of 171 at 320 dp, ~20 %
      // less, compounded by Android's independent font-scale setting — is a product
      // decision for ifero and is checked by hand in the AC7 script, not here.
      for (const size of [{ tileWidth: 136, tileHeight: 111 }, {}]) {
        const { unmount } = render(
          <CardTile card={{ ...mockCard, name: 'Supermercato Esselunga Fidaty Plus' }} {...size} />
        );
        const name = screen.getByText('Supermercato Esselunga Fidaty Plus');
        expect(name.props.numberOfLines).toBe(1);
        expect(name.props.ellipsizeMode).toBe('tail');
        unmount();
      }
    });
  });

  describe('Name Truncation', () => {
    it('renders full card name and relies on native ellipsis for truncation', () => {
      const longNameCard: LoyaltyCard = {
        ...mockCard,
        name: 'This is a very long card name that exceeds twenty characters'
      };
      render(<CardTile card={longNameCard} />);
      expect(
        screen.getByText('This is a very long card name that exceeds twenty characters')
      ).toBeTruthy();
    });

    it('does not truncate card name 20 characters or less', () => {
      render(<CardTile card={{ ...mockCard, name: 'Short Name' }} />);
      const name = screen.getByText('Short Name');
      expect(name.props.children).toBe('Short Name');
    });
  });

  describe('Dark mode — AC7', () => {
    beforeEach(() => {
      (useTheme as jest.Mock).mockReturnValue({
        theme: {
          primary: '#4DA3FF',
          surface: '#1C1C1E',
          textPrimary: '#F5F5F7',
          textSecondary: '#D9D9DE',
          border: '#38383A',
          borderStrong: '#66666B',
          surfaceElevated: '#2C2C2E',
          warning: '#F59E0B'
        },
        isDark: true
      });
    });

    it('applies border to black-branded cards in dark mode', () => {
      const blackBrandCard: LoyaltyCard = { ...mockCard, brandId: 'zara' };
      (useBrandLogo as jest.Mock).mockReturnValue({
        id: 'zara',
        name: 'Zara',
        color: '#000000',
        logo: 'zara',
        aliases: []
      });

      const { toJSON } = render(<CardTile card={blackBrandCard} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('#40404A');
    });
  });

  describe('Card Tap Interaction', () => {
    it('navigates to card details on press', () => {
      render(<CardTile card={mockCard} />);
      const tile = screen.getByLabelText('Test Store');
      fireEvent.press(tile);
      expect(mockPush).toHaveBeenCalledWith('/card/1');
    });

    it('handles pressIn/pressOut for pressed styling without crashing (Story 9.2 Pressable refactor)', () => {
      render(<CardTile card={mockCard} />);
      const tile = screen.getByLabelText('Test Store');
      expect(() => {
        fireEvent(tile, 'pressIn');
        fireEvent(tile, 'pressOut');
      }).not.toThrow();
      expect(screen.getByText('Test Store')).toBeTruthy();
    });
  });

  describe('Accessibility — AC9', () => {
    it('has correct accessibility role', () => {
      render(<CardTile card={mockCard} />);
      const tile = screen.getByLabelText('Test Store');
      expect(tile.props.accessibilityRole).toBe('button');
    });

    it('has correct accessibility hint', () => {
      render(<CardTile card={mockCard} />);
      const tile = screen.getByLabelText('Test Store');
      expect(tile.props.accessibilityHint).toBe('Opens card details');
    });
  });

  describe('New Card Highlight', () => {
    it('renders without crashing when highlighted is true', () => {
      const { toJSON } = render(<CardTile card={mockCard} highlighted />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Favourite badge — Story 9.2 (AC2, AC3)', () => {
    it('renders the favourite badge when isFavorite is true (AC2)', () => {
      render(<CardTile card={{ ...mockCard, isFavorite: true }} />);
      expect(screen.getByTestId('favourite-badge')).toBeTruthy();
    });

    it('does not render the favourite badge when isFavorite is false (AC3)', () => {
      render(<CardTile card={{ ...mockCard, isFavorite: false }} />);
      expect(screen.queryByTestId('favourite-badge')).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty card name gracefully', () => {
      const { toJSON } = render(<CardTile card={{ ...mockCard, name: '' }} />);
      expect(toJSON()).toBeTruthy();
    });

    it('handles single character card name', () => {
      render(<CardTile card={{ ...mockCard, name: 'A' }} />);
      const elements = screen.getAllByText('A');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('handles special characters in card name', () => {
      render(<CardTile card={{ ...mockCard, name: "Store's & More!" }} />);
      expect(screen.getByText("Store's & More!")).toBeTruthy();
    });
  });
});
