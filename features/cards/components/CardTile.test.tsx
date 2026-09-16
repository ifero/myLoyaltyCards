/**
 * CardTile Component Tests
 * Story 13.2: Restyle Home Screen — AC1, AC7, AC9
 * Story 16.22: Fix card-grid tile overlap — AC1, AC5, AC9 (tileWidth/tileHeight props)
 * Story 21.2: Migrate the colour tokens to Ink & Beam — AC8, AC9
 */

import { render, screen, fireEvent } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { StyleSheet, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { LoyaltyCard } from '@/core/schemas';

import { useTheme } from '@/shared/theme';

import {
  CardTile,
  TILE_WIDTH,
  TILE_HEIGHT,
  TILE_RADIUS,
  SINGLE_TILE_WIDTH,
  SINGLE_TILE_HEIGHT,
  SINGLE_TILE_RADIUS
} from './CardTile';
import { useBrandLogo } from '../hooks/useBrandLogo';
import {
  AVATAR_SIZE,
  BADGE_CLEARANCE,
  LOGO_SLOT_SIZE,
  getFallbackChildMetrics,
  getGridTileHeight
} from '../utils/gridLayout';

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: jest.fn()
}));

// Mock ThemeProvider
jest.mock('@/shared/theme', () => ({
  useTheme: jest.fn()
}));

// Mock CARD_COLORS + IDENTITY_COLORS. The identity triple is read at MODULE
// scope (`HIGHLIGHT_RGB`), so an incomplete mock fails at import time rather
// than inside an assertion — hence the real values, not stand-ins.
jest.mock('@/shared/theme/colors', () => ({
  CARD_COLORS: {
    blue: '#1A73E8',
    red: '#E2231A',
    green: '#16A34A',
    orange: '#F59E0B',
    grey: '#64748B'
  },
  IDENTITY_COLORS: {
    ink: '#181824',
    beam: '#FCCC0C',
    cream: '#F0F0E8'
  }
}));

// Mock useBrandLogo
jest.mock('../hooks/useBrandLogo', () => ({
  useBrandLogo: jest.fn()
}));

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
        primary: '#181824',
        surface: '#FFFFFF',
        textPrimary: '#181824',
        textSecondary: '#55555F',
        border: '#D6D6CB',
        borderStrong: '#9A9A93',
        surfaceElevated: '#F7F7F1',
        warning: '#181824'
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
     * The tile's two fallback children (`logoSlot`, `avatarCircle`) are centre-aligned
     * while `favouriteBadge` is pinned to the right edge. Story 16.22 made the tile
     * track the viewport, at which point the children's FIXED 64 / 48 pt became the
     * same species of frozen measurement the tile itself had been — so they are now
     * derived from the tile and capped against the badge by
     * `gridLayout.getFallbackChildMetrics`.
     *
     * The widths below deliberately go past what ships today. 136 pt is the tile at
     * 320 dp (the narrowest width AC7 exercises), but the interesting cases are the
     * ones a **3-column** grid produces — 116 pt at 412 dp and 98 pt at 360 dp — which
     * is 16.22's own flagged follow-up and already the pattern in `CatalogueGrid.tsx`.
     * A fixed 64 pt slot overlaps the badge by 4 pt at 116 pt, so these assertions are
     * falsifiable against the previous implementation rather than vacuous.
     *
     * The exhaustive sweep across every 2- and 3-column width lives in
     * `utils/gridLayout.test.ts`; these are the integration proof that the component
     * actually applies it.
     */
    describe('fallback children clear the favourite badge', () => {
      /** Right-pinned badge: its left edge is tileWidth − (right + width). */
      const badgeLeftEdge = (tileWidth: number): number => {
        const badge = StyleSheet.flatten(screen.getByTestId('favourite-badge').props.style) as {
          right?: number;
          width?: number;
        };
        expect(badge.right).toBeDefined();
        expect(badge.width).toBeDefined();
        return tileWidth - (badge.right! + badge.width!);
      };

      /**
       * Size of the nearest styled ancestor of a text node — the fallback plate that
       * holds it. Walks up rather than assuming a depth, because RNTL interposes
       * composite elements that carry no style of their own.
       */
      const enclosingSize = (text: string): number | undefined => {
        let node = screen.getByText(text).parent;
        while (node) {
          const style = StyleSheet.flatten(node.props?.style) as { width?: number } | undefined;
          if (typeof style?.width === 'number') return style.width;
          node = node.parent;
        }
        return undefined;
      };

      /** Applied glyph size on the text node itself. */
      const glyphSize = (text: string): number | undefined =>
        (
          StyleSheet.flatten(screen.getByText(text).props.style) as
            | { fontSize?: number }
            | undefined
        )?.fontSize;

      const asBrandWithoutSvg = () => {
        (useBrandLogo as jest.Mock).mockReturnValue({
          id: 'esselunga',
          name: 'Esselunga',
          color: '#DB1F26',
          logo: 'esselunga',
          aliases: []
        });
        // Catalogue brand whose SVG asset is missing → the abbreviation-slot branch.
        (getBrandLogo as jest.Mock).mockReturnValue(undefined);
      };

      /** Tile widths worth pinning: the reference, today's narrowest, and 3-column. */
      const TILE_WIDTHS = [
        { tileWidth: TILE_WIDTH, note: '390 dp, 2 columns — the design reference' },
        { tileWidth: 136, note: '320 dp, 2 columns — narrowest shipping width' },
        { tileWidth: 116, note: '412 dp, 3 columns — was a 4 pt overlap' },
        { tileWidth: 98, note: '360 dp, 3 columns — the badge cap binds' }
      ];

      describe.each(TILE_WIDTHS)('at a $tileWidth pt tile ($note)', ({ tileWidth }) => {
        it('keeps the brand-abbreviation slot clear of the badge', () => {
          asBrandWithoutSvg();
          render(
            <CardTile
              card={{ ...mockCard, brandId: 'esselunga', isFavorite: true }}
              tileWidth={tileWidth}
              tileHeight={getGridTileHeight(tileWidth)}
            />
          );

          const slotSize = enclosingSize('ES');
          expect(slotSize).toBeDefined();
          // Centred child, so its right edge is tileWidth / 2 + size / 2.
          const rightEdge = tileWidth / 2 + slotSize! / 2;
          expect(badgeLeftEdge(tileWidth) - rightEdge).toBeGreaterThanOrEqual(BADGE_CLEARANCE);
        });

        it('keeps the first-letter avatar clear of the badge', () => {
          (useBrandLogo as jest.Mock).mockReturnValue(undefined);
          render(
            <CardTile
              card={{ ...mockCard, isFavorite: true }}
              tileWidth={tileWidth}
              tileHeight={getGridTileHeight(tileWidth)}
            />
          );

          const avatarSize = enclosingSize('T');
          expect(avatarSize).toBeDefined();
          const rightEdge = tileWidth / 2 + avatarSize! / 2;
          expect(badgeLeftEdge(tileWidth) - rightEdge).toBeGreaterThanOrEqual(BADGE_CLEARANCE);
        });

        it('delegates both plate and glyph sizing to gridLayout', () => {
          // Not a restatement of the clearance above: this pins that the component
          // reads the shared arithmetic (and picks the right reference per branch)
          // instead of carrying a second copy that could drift from the sweep.
          asBrandWithoutSvg();
          render(
            <CardTile
              card={{ ...mockCard, brandId: 'esselunga', isFavorite: true }}
              tileWidth={tileWidth}
              tileHeight={getGridTileHeight(tileWidth)}
            />
          );
          const slot = getFallbackChildMetrics(tileWidth, LOGO_SLOT_SIZE);
          expect(enclosingSize('ES')).toBe(slot.size);
          expect(glyphSize('ES')).toBe(slot.fontSize);

          (useBrandLogo as jest.Mock).mockReturnValue(undefined);
          render(
            <CardTile
              card={mockCard}
              tileWidth={tileWidth}
              tileHeight={getGridTileHeight(tileWidth)}
            />
          );
          const avatar = getFallbackChildMetrics(tileWidth, AVATAR_SIZE);
          expect(enclosingSize('T')).toBe(avatar.size);
          expect(glyphSize('T')).toBe(avatar.fontSize);
        });
      });

      it('leaves the 390 dp reference tile pixel-identical to the fixed sizes it replaces', () => {
        // The counterweight to the tests above: proportional sizing must not change
        // the design reference. 64 / 48 / 18 pt were the shipped values.
        asBrandWithoutSvg();
        render(
          <CardTile
            card={{ ...mockCard, brandId: 'esselunga', isFavorite: true }}
            tileWidth={TILE_WIDTH}
            tileHeight={TILE_HEIGHT}
          />
        );
        expect(enclosingSize('ES')).toBe(64);
        expect(glyphSize('ES')).toBe(18);

        (useBrandLogo as jest.Mock).mockReturnValue(undefined);
        render(<CardTile card={mockCard} tileWidth={TILE_WIDTH} tileHeight={TILE_HEIGHT} />);
        expect(enclosingSize('T')).toBe(48);
        expect(glyphSize('T')).toBe(18);
      });

      it('shrinks the plates on a narrower tile rather than holding them fixed', () => {
        // Falsifiability guard: the whole change is that these are no longer constant.
        asBrandWithoutSvg();
        render(
          <CardTile
            card={{ ...mockCard, brandId: 'esselunga', isFavorite: true }}
            tileWidth={116}
            tileHeight={getGridTileHeight(116)}
          />
        );
        const narrow = enclosingSize('ES');
        expect(narrow).toBeLessThan(64);
        // ...and the previous fixed 64 pt would have overlapped here, by 4 pt.
        expect(116 / 2 + 64 / 2).toBeGreaterThan(badgeLeftEdge(116));
      });
    });

    it('still delegates long-name truncation to the platform on a narrow tile', () => {
      // The name sits BELOW the tile and tracks its width, so it truncates ~20 % sooner
      // at 320 dp than at the 390 dp reference. Documented rather than changed: going to
      // two lines or clamping the font scale is a design decision, not a bug fix.
      render(
        <CardTile
          card={{ ...mockCard, name: 'Supermercato Esselunga Fidaty Plus' }}
          tileWidth={136}
          tileHeight={111}
        />
      );
      const name = screen.getByText('Supermercato Esselunga Fidaty Plus');
      expect(name.props.numberOfLines).toBe(1);
      expect(name.props.ellipsizeMode).toBe('tail');
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
          primary: '#FCCC0C',
          surface: '#181824',
          textPrimary: '#F0F0E8',
          textSecondary: '#B5B5AB',
          border: '#3A3A48',
          borderStrong: '#55555F',
          surfaceElevated: '#20202E',
          warning: '#FCCC0C'
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
      // `theme.border` since Story 21.2 — the design system names #3A3A48 for
      // exactly this ("a near-black brand takes a #3A3A48 outline in dark
      // mode"), where the component carried a one-off #40404A.
      expect(json).toContain('#3A3A48');
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

  describe('Favourite badge — Story 9.2 (AC2, AC3), recoloured in Story 21.2 (AC9)', () => {
    it('renders the favourite badge when isFavorite is true (AC2)', () => {
      render(<CardTile card={{ ...mockCard, isFavorite: true }} />);
      expect(screen.getByTestId('favourite-badge')).toBeTruthy();
    });

    it('does not render the favourite badge when isFavorite is false (AC3)', () => {
      render(<CardTile card={{ ...mockCard, isFavorite: false }} />);
      expect(screen.queryByTestId('favourite-badge')).toBeNull();
    });

    /**
     * The plate is opaque INK and the star is BEAM.
     *
     * Both halves matter and neither is cosmetic. The plate was a 95%-white
     * disc, which is invisible on a light brand — and it must stay OPAQUE,
     * because it is the only thing standing between a beam star and Esselunga's
     * #FFCC00, three points away. The star was `theme.warning`, an amber the
     * system does not contain, which also coupled the favourite marker to an
     * unrelated semantic role: changing one repainted the other.
     */
    it('uses an opaque ink plate carrying a beam star (AC9)', () => {
      render(<CardTile card={{ ...mockCard, isFavorite: true }} />);

      const badge = StyleSheet.flatten(
        screen.getByTestId('favourite-badge').props.style
      ) as ViewStyle;
      expect(badge.backgroundColor).toBe('#181824');

      const json = JSON.stringify(screen.toJSON());
      expect(json).toContain('#FCCC0C');
      expect(json).not.toContain('rgba(255, 255, 255, 0.95)');
    });

    it('keeps the star independent of theme.warning (AC9)', () => {
      // A theme whose `warning` is a colour nothing else uses: if the star were
      // still borrowing it, it would show up here.
      (useTheme as jest.Mock).mockReturnValue({
        theme: {
          primary: '#181824',
          surface: '#FFFFFF',
          textPrimary: '#181824',
          textSecondary: '#55555F',
          border: '#D6D6CB',
          borderStrong: '#9A9A93',
          surfaceElevated: '#F7F7F1',
          warning: '#123456'
        },
        isDark: false
      });

      render(<CardTile card={{ ...mockCard, isFavorite: true }} />);
      expect(JSON.stringify(screen.toJSON())).not.toContain('#123456');
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
