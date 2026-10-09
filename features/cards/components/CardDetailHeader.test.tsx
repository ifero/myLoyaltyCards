/**
 * CardDetailHeader — the card-detail header's scroll choreography (Story 22.3).
 *
 * The frames' matrix is asserted through the worklets the header runs on the UI thread: the
 * Reanimated mock leaves animated styles unevaluated, so what a style WOULD be at an offset is
 * read from the worklet that computes it. The components are rendered through the real
 * `StoryDecorator`, because their colours are the scheme's roles — and, in the last block, with
 * `useAnimatedStyle` running its updater, so each layer is seen taking its own opacity.
 */
import { render, screen } from '@testing-library/react-native';
import React, { useEffect } from 'react';
import { PixelRatio, StyleSheet } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

import { TYPOGRAPHY } from '@/shared/theme/typography';

import { StoryDecorator } from '@/.storybook/StoryDecorator';

import {
  CardDetailHeaderBackground,
  CardDetailHeaderTitle,
  HEADER_BLEND_DISTANCE,
  HEADER_BLEND_END,
  HEADER_BLEND_MIDPOINT,
  HEADER_BLEND_START,
  HERO_HEIGHT,
  fieldTakesHairline,
  getBlendSettleOffset,
  getHeaderLayers,
  getHeaderTitleOpacity,
  getHeroContentOpacity,
  isPastBlendMidpoint
} from './CardDetailHeader';

type Scheme = 'light' | 'dark';

/** One physical pixel on a 3× phone, in points. */
const PIXEL = 1 / 3;
const ESSELUNGA = '#FFCC00';
const CREAM = '#F0F0E8';

/** Every value the header draws at an offset, from the worklets that draw them. */
const phaseAt = (offset: number, fieldHasHairline = false) => ({
  layers: getHeaderLayers(offset, PIXEL, fieldHasHairline),
  title: getHeaderTitleOpacity(offset, PIXEL),
  heroContent: getHeroContentOpacity(offset),
  pastMidpoint: isPastBlendMidpoint(offset)
});

/** What the bar shows where a `field` layer at `opacity` sits over an opaque `ground`. */
const composite = (field: string, ground: string, opacity: number) => {
  const channel = (hex: string, index: number) =>
    parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
  return `#${[0, 1, 2]
    .map((index) =>
      Math.round(channel(field, index) * opacity + channel(ground, index) * (1 - opacity))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')
    .toUpperCase()}`;
};

describe('the blend band', () => {
  it('starts as the hero leaves and runs 48pt, flipping the controls halfway', () => {
    expect(HERO_HEIGHT).toBe(200);
    expect(HEADER_BLEND_START).toBe(HERO_HEIGHT);
    expect(HEADER_BLEND_DISTANCE).toBe(48);
    expect(HEADER_BLEND_END).toBe(248);
    expect(HEADER_BLEND_MIDPOINT).toBe(224);
  });
});

describe('the frames, offset by offset', () => {
  // Frame A — one field: the bar's own layers are hidden, so the bar shows the hero beneath it.
  it('at rest shows the field through a bare bar, with no title', () => {
    expect(phaseAt(0)).toEqual({
      layers: { ground: 0, field: 0, hairline: 0 },
      title: 0,
      heroContent: 1,
      pastMidpoint: false
    });
  });

  // While any of the hero is under the bar, the bar shows exactly the hero's colour: it IS the
  // hero. Only the hero's logo or avatar fades, over the first 100pt.
  it.each([1, 50, 100, 150, 199.9])(
    'at %spt keeps the bar on the hero while the logo or avatar fades',
    (offset) => {
      const phase = phaseAt(offset);
      expect(phase.layers).toEqual({ ground: 0, field: 0, hairline: 0 });
      expect(phase.title).toBe(0);
      expect(phase.pastMidpoint).toBe(false);
      expect(phase.heroContent).toBeCloseTo(Math.max(0, 1 - offset / 100), 5);
    }
  );

  // Frame B. The ground and the field appear together, the field opaque, so the moment the hero
  // has gone nothing changes on screen; then the field fades out as the title fades in, in step.
  it('blends from the field to the ground as the title fades in, in step', () => {
    expect(phaseAt(200).layers).toEqual({ ground: 1, field: 1, hairline: 0 });
    for (const offset of [200, 206, 212, 218, 224, 230, 236, 242, 247]) {
      const { layers, title } = phaseAt(offset);
      expect(layers.ground).toBe(1);
      expect(layers.hairline).toBe(0);
      expect(layers.field).toBeCloseTo((248 - offset) / 48, 5);
      expect(layers.field + title).toBeCloseTo(1, 5);
    }
  });

  it('is frame B halfway: Esselunga at half strength over cream, the title half-faded', () => {
    const { layers, title } = phaseAt(224);
    expect(composite(ESSELUNGA, CREAM, layers.field)).toBe('#F8DE74');
    expect(title).toBe(0.5);
  });

  it('flips the controls at the midpoint, not before', () => {
    expect(isPastBlendMidpoint(223.9)).toBe(false);
    expect(isPastBlendMidpoint(224)).toBe(true);
  });

  // Frame C, from one physical pixel short of 248: Android scrolls in whole pixels and on some
  // densities never lands on 248 itself.
  it.each([HEADER_BLEND_END - PIXEL, HEADER_BLEND_END, 300, 2000])(
    'is condensed at %spt: the ground, the hairline and the whole title',
    (offset) => {
      expect(phaseAt(offset)).toEqual({
        layers: { ground: 1, field: 0, hairline: 1 },
        title: 1,
        heroContent: 0,
        pastMidpoint: true
      });
    }
  );

  it('is not yet condensed two physical pixels short of 248', () => {
    expect(phaseAt(HEADER_BLEND_END - 2 * PIXEL).layers.hairline).toBe(0);
  });

  // iOS bounces the scroll below zero at the top: the bar keeps showing the hero (whose extension
  // paints above it), and the logo stays whole.
  it.each([-1, -80])('overscrolled to %spt, still shows the field', (offset) => {
    expect(phaseAt(offset)).toEqual({
      layers: { ground: 0, field: 0, hairline: 0 },
      title: 0,
      heroContent: 1,
      pastMidpoint: false
    });
  });

  // Scrolling back retraces every step from the offset alone: the worklets read nothing but it.
  // That nothing is timed is asserted where the styles are evaluated, below.
  it('reverses every step with the scroll', () => {
    const offsets = Array.from({ length: 61 }, (_, index) => index * 5);

    const down = offsets.map((offset) => phaseAt(offset));
    const up = [...offsets].reverse().map((offset) => phaseAt(offset));

    expect(up).toEqual([...down].reverse());
  });
});

describe('a light field keeps its rule', () => {
  // The hero draws a 1pt rule under a very light field on cream; the opaque field layer covers it
  // exactly when the scroll rests at the blend's start, so the bar carries it from there on.
  it('takes the hairline from the start of the blend', () => {
    expect(getHeaderLayers(HEADER_BLEND_START, PIXEL, true).hairline).toBe(1);
    expect(getHeaderLayers(HEADER_BLEND_MIDPOINT, PIXEL, true).hairline).toBe(1);
    expect(getHeaderLayers(HEADER_BLEND_START - 1, PIXEL, true).hairline).toBe(0);
  });

  it('only in the light scheme, and only on a very light field', () => {
    expect(fieldTakesHairline('#FFFFFF', false)).toBe(true);
    expect(fieldTakesHairline('#FFFFFF', true)).toBe(false);
    // Esselunga's yellow is light, but not so light that it dissolves into cream.
    expect(fieldTakesHairline(ESSELUNGA, false)).toBe(false);
    expect(fieldTakesHairline('#0C843C', false)).toBe(false);
  });
});

describe('no resting mid-blend', () => {
  it.each([
    [HEADER_BLEND_START + PIXEL, HEADER_BLEND_START],
    [210, HEADER_BLEND_START],
    [223.9, HEADER_BLEND_START],
    [224, HEADER_BLEND_END],
    [240, HEADER_BLEND_END],
    [HEADER_BLEND_END - 2 * PIXEL, HEADER_BLEND_END]
  ])('settles a scroll resting at %spt to %spt, the nearer end', (offset, end) => {
    expect(getBlendSettleOffset(offset, PIXEL)).toBe(end);
  });

  it.each([-40, 0, 120, HEADER_BLEND_START, HEADER_BLEND_END - PIXEL, HEADER_BLEND_END, 600])(
    'leaves a scroll resting at %spt exactly where it is',
    (offset) => {
      expect(getBlendSettleOffset(offset, PIXEL)).toBeNull();
    }
  );
});

/** Hands the components a shared value, as the screen does, and exposes it to the test. */
const OffsetHarness = ({
  initial,
  children,
  onOffset
}: {
  initial: number;
  children: (offset: SharedValue<number>) => React.ReactNode;
  onOffset?: (offset: SharedValue<number>) => void;
}) => {
  const offset = useSharedValue(initial);
  useEffect(() => {
    onOffset?.(offset);
  }, [offset, onOffset]);
  return <>{children(offset)}</>;
};

const flat = (testID: string) =>
  StyleSheet.flatten(
    screen.getByTestId(testID, { includeHiddenElements: true }).props.style
  ) as Record<string, unknown>;

describe('CardDetailHeaderBackground', () => {
  const renderBackground = (fieldColor: string, scheme: Scheme = 'light') =>
    render(
      <StoryDecorator theme={scheme}>
        <OffsetHarness initial={0}>
          {(offset) => <CardDetailHeaderBackground fieldColor={fieldColor} scrollOffset={offset} />}
        </OffsetHarness>
      </StoryDecorator>
    );

  it.each<[Scheme, string, string]>([
    ['light', '#F0F0E8', '#D6D6CB'],
    ['dark', '#000000', '#3A3A48']
  ])('in %s, lays the field over the ground and rules a 1pt hairline', (scheme, ground, rule) => {
    renderBackground(ESSELUNGA, scheme);

    // The ground and the field each fill the bar, the field drawn after — so over — the ground:
    // the other way round, the opaque ground would cover the field the moment the hero has gone.
    const fillsTheBar = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };
    expect(flat('card-detail-header-background')).toMatchObject(fillsTheBar);
    const layers = screen.getByTestId('card-detail-header-background').children;
    expect(
      layers.map((layer: (typeof layers)[number]) =>
        typeof layer === 'string' ? layer : layer.props.testID
      )
    ).toEqual([
      'card-detail-header-ground',
      'card-detail-header-field',
      'card-detail-header-hairline'
    ]);
    expect(flat('card-detail-header-ground')).toMatchObject({
      ...fillsTheBar,
      backgroundColor: ground
    });
    // The field stays the brand's own hex in either scheme — never tinted or washed.
    expect(flat('card-detail-header-field')).toMatchObject({
      ...fillsTheBar,
      backgroundColor: ESSELUNGA
    });
    expect(flat('card-detail-header-hairline')).toMatchObject({
      backgroundColor: rule,
      height: 1,
      bottom: 0,
      left: 0,
      right: 0
    });
  });

  it('draws no shadow, and takes no touches', () => {
    renderBackground('#E42424');
    for (const testID of [
      'card-detail-header-background',
      'card-detail-header-ground',
      'card-detail-header-field',
      'card-detail-header-hairline'
    ]) {
      const style = flat(testID);
      for (const key of ['shadowColor', 'shadowOpacity', 'shadowRadius', 'elevation']) {
        expect(style[key]).toBeUndefined();
      }
    }
    expect(flat('card-detail-header-background').pointerEvents).toBe('none');
  });
});

describe('CardDetailHeaderTitle', () => {
  const renderTitle = (isPastMidpoint: boolean, scheme: Scheme = 'light') =>
    render(
      <StoryDecorator theme={scheme}>
        <OffsetHarness initial={0}>
          {(offset) => (
            <CardDetailHeaderTitle
              title="Esselunga"
              scrollOffset={offset}
              isPastMidpoint={isPastMidpoint}
            />
          )}
        </OffsetHarness>
      </StoryDecorator>
    );

  const title = () =>
    screen.getByTestId('card-detail-header-title', { includeHiddenElements: true });

  it.each<[Scheme, string]>([
    ['light', '#181824'],
    ['dark', '#F0F0E8']
  ])('is the card name in bodyLgStrong, textPrimary, in %s', (scheme, hex) => {
    renderTitle(true, scheme);
    expect(title().props.children).toBe('Esselunga');
    expect(flat('card-detail-header-title')).toMatchObject({
      ...TYPOGRAPHY.bodyLgStrong,
      color: hex,
      textAlign: 'center'
    });
  });

  // The bar does not grow, so a title that scaled with Dynamic Type would only be cut off — the
  // native title it replaces does not scale either.
  it('holds one line at its own size, clear of both controls', () => {
    renderTitle(true);
    expect(title().props.numberOfLines).toBe(1);
    expect(title().props.allowFontScaling).toBe(false);
    // The jest window is 750pt wide: 48pt button + 24pt margin + 8pt gap, each side.
    expect(flat('card-detail-header-title').maxWidth).toBe(750 - 2 * (48 + 24 + 8));
  });

  it('is the bar’s heading past the midpoint', () => {
    renderTitle(true);
    expect(screen.getByRole('header', { name: 'Esselunga' })).toBeTruthy();
    expect(title().props.accessibilityElementsHidden).toBe(false);
    expect(title().props.importantForAccessibility).toBe('auto');
  });

  // Before the midpoint the title is at most half-faded over the field: a screen reader must not
  // reach it, on either platform.
  it('is hidden from screen readers before the midpoint', () => {
    renderTitle(false);
    expect(screen.queryByRole('header', { name: 'Esselunga' })).toBeNull();
    expect(title().props.accessibilityElementsHidden).toBe(true);
    expect(title().props.importantForAccessibility).toBe('no-hide-descendants');
  });
});

/**
 * Which worklet drives which layer. The global mock returns `{}` from `useAnimatedStyle`, so here
 * — in this block only — it runs the updater, as the device does on the first frame, and every
 * layer is read at the offset it was rendered at.
 */
describe('the bar, rendered at each offset', () => {
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

  /** One physical pixel in this environment, which is what the components measure by. */
  const onePixel = 1 / PixelRatio.get();

  const renderBar = (offset: number, fieldColor = ESSELUNGA, scheme: Scheme = 'light') =>
    render(
      <StoryDecorator theme={scheme}>
        <OffsetHarness initial={offset}>
          {(scrollOffset) => (
            <>
              <CardDetailHeaderBackground fieldColor={fieldColor} scrollOffset={scrollOffset} />
              <CardDetailHeaderTitle
                title="Esselunga"
                scrollOffset={scrollOffset}
                isPastMidpoint={isPastBlendMidpoint(offset)}
              />
            </>
          )}
        </OffsetHarness>
      </StoryDecorator>
    );

  const opacities = () => ({
    ground: flat('card-detail-header-ground').opacity,
    field: flat('card-detail-header-field').opacity,
    hairline: flat('card-detail-header-hairline').opacity,
    title: flat('card-detail-header-title').opacity
  });

  it.each([
    ['at rest', 0, { ground: 0, field: 0, hairline: 0, title: 0 }],
    ['with the hero still under the bar', 150, { ground: 0, field: 0, hairline: 0, title: 0 }],
    ['half-way through the blend', 224, { ground: 1, field: 0.5, hairline: 0, title: 0.5 }],
    [
      'one physical pixel short of 248',
      HEADER_BLEND_END - onePixel,
      { ground: 1, field: 0, hairline: 1, title: 1 }
    ]
  ])('draws each layer and the title %s (%spt)', (_label, offset, expected) => {
    renderBar(offset);
    expect(opacities()).toEqual(expected);
  });

  // The opaque field layer covers the hero's own rule at the bar's edge exactly when the scroll
  // rests at the blend's start, so a white field's rule is the bar's from there on.
  it('keeps a white field’s hairline when the scroll rests at 200', () => {
    renderBar(HEADER_BLEND_START, '#FFFFFF');
    expect(opacities()).toEqual({ ground: 1, field: 1, hairline: 1, title: 0 });
  });

  it('draws no hairline at 200 under a field that is not that light', () => {
    renderBar(HEADER_BLEND_START);
    expect(opacities()).toEqual({ ground: 1, field: 1, hairline: 0, title: 0 });
  });

  // The light field's rule is for cream: over the black ground a white field needs none.
  it('draws no hairline at 200 under a white field in dark', () => {
    renderBar(HEADER_BLEND_START, '#FFFFFF', 'dark');
    expect(opacities()).toEqual({ ground: 1, field: 1, hairline: 0, title: 0 });
  });

  // The blend follows the offset and is never timed: no layer or title reaches for an animation.
  // The spies go in before each render, which captures them in the styles' worklets.
  it('times nothing at any offset', () => {
    const timers = ['withTiming', 'withSpring', 'withDelay', 'withRepeat'].map((name) =>
      jest.spyOn(reanimated, name)
    );

    try {
      for (const offset of [0, 150, HEADER_BLEND_START, 224, HEADER_BLEND_END]) {
        renderBar(offset, '#FFFFFF').unmount();
      }
      for (const timer of timers) {
        expect(timer).not.toHaveBeenCalled();
      }
    } finally {
      timers.forEach((timer) => timer.mockRestore());
    }
  });
});
