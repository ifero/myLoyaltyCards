/**
 * BrandHero Component Tests
 * Story 13.3: Restyle Card Detail Screen (AC1)
 * Story 22.3: Card Detail — the hero carries the logo or the avatar, and nothing else
 *
 * Rendered through the real `StoryDecorator`, because the light-field hairline is the scheme's
 * `border` and exists in the light scheme only.
 */

import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import type { LoyaltyCard } from '@/core/schemas';

import { StoryDecorator } from '@/.storybook/StoryDecorator';

import { BrandHero } from './BrandHero';

// Mock useBrandLogo
const mockUseBrandLogo = jest.fn();
jest.mock('../hooks/useBrandLogo', () => ({
  useBrandLogo: (...args: unknown[]) => mockUseBrandLogo(...args)
}));

// Mock brandLogos
const MockLogoComponent = ({ width, height }: { width: number; height: number }) =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react').createElement('View', { testID: 'mock-svg-logo', style: { width, height } });

const mockGetBrandLogo = jest.fn<unknown, [string]>(() => MockLogoComponent);
jest.mock('../utils/brandLogos', () => ({
  getBrandLogo: (logo: string) => mockGetBrandLogo(logo)
}));

jest.mock('./BrandLogo', () => ({
  BrandLogo: ({ source, width, height }: { source: unknown; width: number; height: number }) =>
    typeof source === 'function' ? source({ width, height }) : null
}));

type Scheme = 'light' | 'dark';

/** The jest window: 750 × 1334 (React Native's own DeviceInfo mock). */
const WINDOW_HEIGHT = 1334;
const HEADER_HEIGHT = 113;

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
  name: 'My Conad',
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

/** Conad's own catalogue colour (`catalogue/italy.json`). */
const CONAD = {
  id: 'conad',
  name: 'Conad',
  aliases: [],
  logo: 'conad',
  color: '#DA291C'
};

const renderHero = (
  card: LoyaltyCard,
  { scheme = 'light', testID = 'hero' }: { scheme?: Scheme; testID?: string | null } = {}
) =>
  render(
    <StoryDecorator theme={scheme}>
      <BrandHero card={card} headerHeight={HEADER_HEIGHT} testID={testID ?? undefined} />
    </StoryDecorator>
  );

const flat = (testID: string) =>
  StyleSheet.flatten(
    screen.getByTestId(testID, { includeHiddenElements: true }).props.style
  ) as Record<string, unknown>;

describe('BrandHero', () => {
  beforeEach(() => {
    mockUseBrandLogo.mockReturnValue(undefined);
    mockGetBrandLogo.mockImplementation(() => MockLogoComponent);
  });

  describe('one field, from the top of the screen down', () => {
    // The hero runs up under the transparent bar: one view paints the inset, the bar's area and
    // the band, so no seam can open between them.
    it('is the 200pt band plus the bar it runs under', () => {
      renderHero(mockCustomCard);
      expect(flat('hero')).toMatchObject({
        height: 200 + HEADER_HEIGHT,
        paddingTop: HEADER_HEIGHT
      });
    });

    // iOS bounces the scroll down at the top: the field, never the ground, shows above the hero.
    it('extends the field a window up, overlapping the band by 1pt', () => {
      renderHero(mockCustomCard);
      expect(flat('hero-extension')).toMatchObject({
        position: 'absolute',
        left: 0,
        right: 0,
        top: 1 - WINDOW_HEIGHT,
        height: WINDOW_HEIGHT,
        backgroundColor: flat('hero').backgroundColor
      });
    });

    it('names its parts only when it is given a testID', () => {
      renderHero(mockCustomCard, { testID: null });
      expect(screen.queryByTestId('undefined-avatar', { includeHiddenElements: true })).toBeNull();
      expect(screen.queryByTestId('undefined-extension')).toBeNull();
      expect(screen.queryByTestId('undefined-content')).toBeNull();
    });
  });

  describe('a custom card: its accent, and a letter avatar (frame D)', () => {
    it('fills the field with the card’s accent', () => {
      renderHero(mockCustomCard);
      expect(flat('hero').backgroundColor).toBe('#0C3C84');
    });

    it('shows the first letter in an 80pt circle, and not the name', () => {
      renderHero(mockCustomCard);
      expect(flat('hero-avatar')).toMatchObject({ width: 80, height: 80, borderRadius: 40 });
      expect(screen.getByText('G', { includeHiddenElements: true })).toBeTruthy();
      expect(screen.queryByText('Gym Pass', { includeHiddenElements: true })).toBeNull();
    });

    // The letter repeats the name the content heads with, so the avatar is decoration.
    it('hides the avatar from screen readers on both platforms', () => {
      renderHero(mockCustomCard);
      const avatar = screen.getByTestId('hero-avatar', { includeHiddenElements: true });
      expect(avatar.props.accessibilityElementsHidden).toBe(true);
      expect(avatar.props.importantForAccessibility).toBe('no-hide-descendants');
    });

    it('washes the circle 16 % white on a dark field, the letter in white', () => {
      renderHero({ ...mockCustomCard, color: 'green' });
      expect(flat('hero-avatar')).toMatchObject({ backgroundColor: 'rgba(255, 255, 255, 0.16)' });
      expect(flat('hero-avatar').borderWidth).toBeUndefined();
      expect(
        StyleSheet.flatten(screen.getByText('G', { includeHiddenElements: true }).props.style)
      ).toMatchObject({ color: '#FFFFFF' });
    });

    // An ink wash over the beam-yellow accent would paint mustard; a ring keeps the circle.
    it('rings the circle 1pt in ink on a light field, with no wash', () => {
      renderHero({ ...mockCustomCard, color: 'orange' });
      expect(flat('hero').backgroundColor).toBe('#FCCC0C');
      expect(flat('hero-avatar')).toMatchObject({ borderWidth: 1, borderColor: '#181824' });
      expect(flat('hero-avatar').backgroundColor).toBeUndefined();
    });

    // Story 21.2a, AC4: a legacy or corrupted row reaches here unchecked, and the `??` guard is
    // all that stands between it and a transparent field.
    it('falls back to the default accent for a colour that is not a palette key', () => {
      renderHero({ ...mockCustomCard, color: '#DEADBE' as never });
      expect(flat('hero').backgroundColor).toBe('#0C84CC');
    });

    it('treats a brand id the catalogue does not know as a custom card', () => {
      renderHero({ ...mockCustomCard, brandId: 'gone-from-the-catalogue' });
      expect(flat('hero').backgroundColor).toBe('#0C3C84');
      expect(screen.getByTestId('hero-avatar', { includeHiddenElements: true })).toBeTruthy();
    });
  });

  describe('a branded card: its brand’s hex and its logo (frame A)', () => {
    beforeEach(() => {
      mockUseBrandLogo.mockReturnValue(CONAD);
    });

    it.each<Scheme>(['light', 'dark'])(
      'fills the field with the brand’s own hex in %s, never the stored accent',
      (scheme) => {
        renderHero(mockCatalogueCard, { scheme });
        expect(flat('hero').backgroundColor).toBe('#DA291C');
        expect(mockUseBrandLogo).toHaveBeenCalledWith('conad');
      }
    );

    it('carries the logo straight on the field, as an image named by the brand', () => {
      renderHero(mockCatalogueCard);
      const slot = screen.getByTestId('hero-logo-slot');
      expect(slot.props.accessible).toBe(true);
      expect(slot.props.accessibilityRole).toBe('image');
      expect(screen.getByLabelText('Conad')).toBe(slot);
      expect(screen.getByTestId('mock-svg-logo', { includeHiddenElements: true })).toBeTruthy();
      // No plate: nothing is drawn between the brand's mark and its own colour.
      expect(flat('hero-logo-slot').backgroundColor).toBeUndefined();
    });

    it('falls back to the brand’s first two letters when it has no logo', () => {
      mockGetBrandLogo.mockImplementation(() => undefined);
      renderHero(mockCatalogueCard);
      expect(screen.getByText('CO', { includeHiddenElements: true })).toBeTruthy();
    });

    it('shows no avatar and no name', () => {
      renderHero(mockCatalogueCard);
      expect(screen.queryByTestId('hero-avatar', { includeHiddenElements: true })).toBeNull();
      expect(screen.queryByText('My Conad', { includeHiddenElements: true })).toBeNull();
    });

    it('falls back to the default accent for a brand that has no colour', () => {
      mockUseBrandLogo.mockReturnValue({ ...CONAD, color: undefined as unknown as string });
      renderHero(mockCatalogueCard);
      expect(flat('hero').backgroundColor).toBe('#0C84CC');
    });
  });

  // A very light field would dissolve into the cream ground, so it takes the system hairline —
  // in the light scheme only, where the ground is cream.
  describe('the light-field hairline', () => {
    beforeEach(() => {
      mockUseBrandLogo.mockReturnValue({ ...CONAD, color: '#FFFFFF' });
    });

    it('rules a 1pt `border` along a white field’s bottom edge in light', () => {
      renderHero(mockCatalogueCard);
      expect(flat('hero')).toMatchObject({ borderBottomWidth: 1, borderBottomColor: '#D6D6CB' });
    });

    it('draws none in dark', () => {
      renderHero(mockCatalogueCard, { scheme: 'dark' });
      expect(flat('hero').borderBottomWidth).toBeUndefined();
    });

    it('draws none under a field that is not that light', () => {
      mockUseBrandLogo.mockReturnValue({ ...CONAD, color: '#FFCC00' });
      renderHero(mockCatalogueCard);
      expect(flat('hero').borderBottomWidth).toBeUndefined();
    });
  });

  /**
   * The logo or the avatar fades over the first 100pt of scroll. The global mock returns `{}` from
   * `useAnimatedStyle`, so here — in this block only — it runs the updater, as the device does on
   * the first frame, and the content is read at the offset it was rendered at.
   */
  describe('the mark fades as the hero scrolls away', () => {
    const reanimated = jest.requireMock('react-native-reanimated');
    let runsUpdater: jest.SpyInstance;

    beforeEach(() => {
      runsUpdater = jest
        .spyOn(reanimated, 'useAnimatedStyle')
        .mockImplementation((updater: unknown) => (updater as () => unknown)());
    });

    afterEach(() => {
      runsUpdater.mockRestore();
    });

    const ScrolledHero = ({ offset }: { offset: number }) => {
      const scrollOffset = useSharedValue(offset);
      return <BrandHero card={mockCustomCard} scrollOffset={scrollOffset} testID="hero" />;
    };

    it.each([
      [0, 1],
      [50, 0.5],
      [100, 0]
    ])('at %spt is at opacity %s', (offset, opacity) => {
      render(
        <StoryDecorator>
          <ScrolledHero offset={offset} />
        </StoryDecorator>
      );
      expect(flat('hero-content').opacity).toBe(opacity);
    });

    // The fade follows the offset and is never timed. The spies go in before the render, which
    // captures them in the style's worklet.
    it('times nothing', () => {
      const timers = ['withTiming', 'withSpring', 'withDelay', 'withRepeat'].map((name) =>
        jest.spyOn(reanimated, name)
      );

      try {
        render(
          <StoryDecorator>
            <ScrolledHero offset={50} />
          </StoryDecorator>
        );
        for (const timer of timers) {
          expect(timer).not.toHaveBeenCalled();
        }
      } finally {
        timers.forEach((timer) => timer.mockRestore());
      }
    });
  });
});
