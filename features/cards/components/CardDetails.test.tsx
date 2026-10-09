/**
 * CardDetails Component Tests
 * Story 13.3: Restyle Card Detail Screen
 * Story 22.3: Card Detail — the frames' stack on an offset-tracked scroll view
 *
 * Rendered through the real `StoryDecorator`, because the barcode card's whole point is that it
 * stays white whatever the scheme, and only the real `ThemeProvider` flips the rest. The header
 * itself is the screen's (`CardDetailScreen.test.tsx`); its choreography is `CardDetailHeader`'s.
 */

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import Copy from 'lucide-react-native/icons/copy';
import Lightbulb from 'lucide-react-native/icons/lightbulb';
import Pencil from 'lucide-react-native/icons/pencil';
import SquarePen from 'lucide-react-native/icons/square-pen';
import Sun from 'lucide-react-native/icons/sun';
import Trash from 'lucide-react-native/icons/trash';
import React, { useEffect } from 'react';
import { Alert, Dimensions, StyleSheet } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

import type { LoyaltyCard } from '@/core/schemas';
import { logger } from '@/core/utils/logger';

import { ActionRow } from '@/shared/components/ui/ActionRow';
import { TYPOGRAPHY } from '@/shared/theme/typography';

import { StoryDecorator } from '@/.storybook/StoryDecorator';

import { BrandHero } from './BrandHero';
import { CardDetails } from './CardDetails';

type Scheme = 'light' | 'dark';
type DetailsProps = React.ComponentProps<typeof CardDetails>;

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush })
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' }
}));

jest.mock('@/core/utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() }
}));

// The bars themselves need native modules; what matters here is what the card asks it for.
const mockBarcodeRenderer = jest.fn();
jest.mock('./BarcodeRenderer', () => ({
  BarcodeRenderer: (props: Record<string, unknown>) => {
    mockBarcodeRenderer(props);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react').createElement('View', { testID: 'mock-barcode-renderer' });
  }
}));

jest.mock('./FullscreenBarcode', () => ({
  FullscreenBarcode: ({ visible, onClose }: { visible: boolean; onClose: () => void }) =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').createElement(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('react-native').View,
      { testID: 'fullscreen-barcode-modal', accessibilityState: { expanded: visible } },
      visible
        ? // eslint-disable-next-line @typescript-eslint/no-require-imports
          require('react').createElement(require('react-native').Pressable, {
            testID: 'fullscreen-barcode-close',
            onPress: onClose
          })
        : null
    )
}));

const reanimated: { scrollTo: jest.Mock } = jest.requireMock('react-native-reanimated');

jest.spyOn(Alert, 'alert');

const mockCustomCard: LoyaltyCard = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Test Store',
  barcode: '1234567890128',
  barcodeFormat: 'EAN13',
  brandId: null,
  color: 'blue',
  isFavorite: false,
  lastUsedAt: null,
  usageCount: 0,
  createdAt: '2026-01-07T10:00:00Z',
  updatedAt: '2026-01-07T10:00:00Z'
};

/** A catalogue card whose stored key (`red`) must never surface: its colour is Esselunga's. */
const mockCatalogueCard: LoyaltyCard = {
  ...mockCustomCard,
  id: '660e8400-e29b-41d4-a716-446655440001',
  name: 'Esselunga',
  barcode: '9876543210123',
  brandId: 'esselunga',
  color: 'red',
  createdAt: '2026-02-15T12:00:00Z'
};

/** The offset the screen would own, handed to the test once the content has mounted. */
let offset: SharedValue<number>;

const Harness = ({
  initialOffset = 0,
  ...props
}: Partial<DetailsProps> & { card: LoyaltyCard; initialOffset?: number }) => {
  const screenOffset = useSharedValue(initialOffset);
  offset = screenOffset;
  useEffect(() => {
    offset = screenOffset;
  }, [screenOffset]);
  return <CardDetails scrollOffset={screenOffset} {...props} />;
};

const renderDetails = (
  card: LoyaltyCard = mockCustomCard,
  props: Partial<DetailsProps> & { initialOffset?: number } = {},
  scheme: Scheme = 'light'
) =>
  render(
    <StoryDecorator theme={scheme}>
      <Harness card={card} {...props} />
    </StoryDecorator>
  );

const flat = (element: { props: { style: unknown } }) =>
  StyleSheet.flatten(element.props.style as never) as Record<string, unknown>;

/** A host node of `screen.toJSON()`: what the screen draws, without the components around it. */
type HostNode = { props: { testID?: unknown }; children: (HostNode | string)[] | null };

/** Every host view's testID, in the order the screen draws them. */
const hostTestIDs = (node: HostNode | HostNode[] | null): string[] => {
  if (!node) {
    return [];
  }
  if (Array.isArray(node)) {
    return node.flatMap(hostTestIDs);
  }
  const children = (node.children ?? []).filter(
    (child): child is HostNode => typeof child !== 'string'
  );
  return [
    ...(typeof node.props.testID === 'string' ? [node.props.testID] : []),
    ...children.flatMap(hostTestIDs)
  ];
};

/**
 * Drives the window — and with it `useWindowDimensions` and the pixel ratio — for one test.
 * `useWindowDimensions` reads `Dimensions.get('window')`, so the real hook runs.
 */
let dimensionsSpy: jest.SpyInstance | undefined;
const setWindow = (width: number, scale = 3) => {
  dimensionsSpy = jest
    .spyOn(Dimensions, 'get')
    .mockReturnValue({ width, height: 852, scale, fontScale: 1 });
};

const SHADOW_KEYS = ['shadowColor', 'shadowOffset', 'shadowOpacity', 'shadowRadius', 'elevation'];

describe('CardDetails', () => {
  afterEach(() => {
    dimensionsSpy?.mockRestore();
    dimensionsSpy = undefined;
  });

  /**
   * Frame A's stack, in order: the hero, the card's name, then the barcode card — the first item
   * below the name, so the barcode is on screen without scrolling — the bulb, the details card and
   * MANAGE. Nothing else: no notes, no format row, no heading, no extra buttons.
   */
  describe('at rest: the frames’ stack', () => {
    it('opens on the hero, under the transparent bar, sharing the scroll offset', () => {
      renderDetails(mockCustomCard, { headerHeight: 113 });
      expect(screen.UNSAFE_getByType(BrandHero).props).toMatchObject({
        card: mockCustomCard,
        headerHeight: 113,
        scrollOffset: offset,
        testID: 'card-details-hero'
      });
    });

    it('puts the name first and the barcode card straight below it', () => {
      renderDetails(mockCustomCard, { onToggleBrightness: jest.fn() });
      const sections = [
        'card-details-name',
        'card-details-barcode-preview',
        'card-details-brightness-toggle',
        'card-details-info-section',
        'card-details-manage-section'
      ];
      const [first, second] = React.Children.toArray(
        screen.getByTestId('card-details-stack').props.children
      ) as React.ReactElement<{ testID?: string }>[];

      expect(
        hostTestIDs(screen.toJSON() as HostNode | HostNode[] | null).filter((id) =>
          sections.includes(id)
        )
      ).toEqual(sections);
      expect(first?.props.testID).toBe('card-details-name');
      expect(second?.props.testID).toBe('card-details-barcode-preview');
    });

    it.each<[Scheme, string]>([
      ['light', '#181824'],
      ['dark', '#F0F0E8']
    ])('heads the content with the card’s name in headlineMd, in %s', (scheme, ink) => {
      renderDetails(mockCatalogueCard, {}, scheme);
      const name = screen.getByTestId('card-details-name');

      expect(name.props.children).toBe('Esselunga');
      expect(name.props.accessibilityRole).toBe('header');
      // Two lines at most, as the hero had it, so a long name never pushes the barcode down.
      expect(name.props.numberOfLines).toBe(2);
      expect(flat(name)).toMatchObject({
        ...TYPOGRAPHY.headlineMd,
        color: ink,
        marginVertical: 16
      });
    });

    it('adds nothing the frames ban', () => {
      renderDetails(mockCustomCard, { onToggleBrightness: jest.fn() });

      for (const banned of [
        /notes?/i,
        /format/i,
        /code ?128/i,
        /card details/i,
        /show barcode/i,
        /share/i,
        /card number/i
      ]) {
        expect(screen.queryByText(banned)).toBeNull();
      }
      // No pencil, copy or trash glyph, in either icon family.
      for (const name of ['icon-content-copy', 'icon-edit', 'icon-delete']) {
        expect(screen.queryByTestId(name)).toBeNull();
      }
      for (const Glyph of [Copy, Pencil, SquarePen, Trash]) {
        expect(screen.UNSAFE_queryAllByType(Glyph)).toHaveLength(0);
      }
      // The number is in the details card, not repeated under the bars.
      expect(screen.queryByTestId('card-details-barcode-number-display')).toBeNull();
      expect(screen.getAllByText('1234 5678 9012 8')).toHaveLength(1);
    });
  });

  describe('the barcode card', () => {
    it.each<[Scheme, string]>([
      ['light', '#D6D6CB'],
      ['dark', '#3A3A48']
    ])('stays white in %s, with a 1pt hairline, a 16pt radius, and no shadow', (scheme, rule) => {
      renderDetails(mockCustomCard, {}, scheme);
      const style = flat(screen.getByTestId('card-details-barcode-preview'));

      expect(style).toMatchObject({
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: rule,
        borderRadius: 16,
        paddingVertical: 16
      });
      for (const key of SHADOW_KEYS) {
        expect(style[key]).toBeUndefined();
      }
    });

    it('draws a linear code 280 × 100 on a 393pt phone', () => {
      setWindow(393);
      renderDetails();
      expect(mockBarcodeRenderer).toHaveBeenLastCalledWith(
        expect.objectContaining({
          value: '1234567890128',
          format: 'EAN13',
          width: 280,
          height: 100
        })
      );
    });

    // 24pt margin + 1pt border + the renderer's own 16pt white padding, each side: at 360 that
    // leaves 278 for the bars, and the renderer's white stays inside the card's hairline.
    it('narrows the bars on a phone too slim for 280 and the renderer’s padding', () => {
      setWindow(360);
      renderDetails();
      expect(mockBarcodeRenderer).toHaveBeenLastCalledWith(
        expect.objectContaining({ width: 278, height: 100 })
      );
    });

    // The renderer floors every QR code at 220, so that is the size asked for — and drawn.
    it('draws a QR code at the renderer’s 220 floor', () => {
      renderDetails({ ...mockCustomCard, barcodeFormat: 'QR' });
      expect(mockBarcodeRenderer).toHaveBeenLastCalledWith(
        expect.objectContaining({ format: 'QR', width: 220, height: 220 })
      );
    });

    // Nothing is drawn over the bars: the hint sits below them, in the card, in flow.
    it.each<Scheme>(['light', 'dark'])(
      'holds "Tap to enlarge" below the bars, in the light scheme’s muted text, in %s',
      (scheme) => {
        renderDetails(mockCustomCard, {}, scheme);
        const card = screen.getByTestId('card-details-barcode-preview');
        const hint = within(card).getByText('Tap to enlarge');
        const [bars, below] = React.Children.toArray(card.props.children) as React.ReactElement[];

        expect(bars?.props).toMatchObject({ value: '1234567890128' });
        expect(below?.props).toMatchObject({ children: 'Tap to enlarge' });
        // Padded and centred, so at the largest text sizes it wraps clear of the card's hairline.
        expect(flat(hint)).toMatchObject({
          ...TYPOGRAPHY.captionMd,
          color: '#55555F',
          marginTop: 12,
          paddingHorizontal: 16,
          textAlign: 'center'
        });
        expect(flat(hint).position).toBeUndefined();
      }
    );

    it('is one button that opens the full-screen barcode, and closes it again', async () => {
      renderDetails();
      const card = screen.getByTestId('card-details-barcode-preview');
      expect(card.props.accessibilityRole).toBe('button');
      expect(card.props.accessibilityLabel).toBe('View full screen barcode');
      expect(screen.getByTestId('fullscreen-barcode-modal').props.accessibilityState.expanded).toBe(
        false
      );

      fireEvent.press(card);
      await waitFor(() =>
        expect(
          screen.getByTestId('fullscreen-barcode-modal').props.accessibilityState.expanded
        ).toBe(true)
      );

      fireEvent.press(screen.getByTestId('fullscreen-barcode-close'));
      await waitFor(() =>
        expect(
          screen.getByTestId('fullscreen-barcode-modal').props.accessibilityState.expanded
        ).toBe(false)
      );
    });

    it('scales to 0.98 while held', () => {
      renderDetails();
      const card = screen.getByTestId('card-details-barcode-preview');

      fireEvent(card, 'pressIn');
      expect(flat(screen.getByTestId('card-details-barcode-preview')).transform).toEqual([
        { scale: 0.98 }
      ]);
      fireEvent(card, 'pressOut');
      expect(flat(screen.getByTestId('card-details-barcode-preview')).transform).toBeUndefined();
    });
  });

  // Story 16.39 replaced Story 13.3's AC7 brightness HINT with a working control; ifero made it an
  // icon-only bulb on 2026-09-08. Story 22.3 draws the bulb in Lucide, filled when on.
  describe('the brightness bulb (Story 16.39)', () => {
    const bulb = () => screen.getByTestId('card-details-brightness-toggle');
    const glyph = () => screen.UNSAFE_getByType(Lightbulb);

    it('renders no toggle when the screen supplies no handler', () => {
      renderDetails();
      expect(screen.queryByTestId('card-details-brightness-toggle')).toBeNull();
    });

    it('calls the handler on press', () => {
      const onToggleBrightness = jest.fn();
      renderDetails(mockCustomCard, { onToggleBrightness });
      fireEvent.press(bulb());
      expect(onToggleBrightness).toHaveBeenCalledTimes(1);
    });

    // The bulb's fill is the only visual signal of which way it is set, so it is pinned rather
    // than left to a colour a colour-blind user might not read.
    it.each<[Scheme, string]>([
      ['light', '#181824'],
      ['dark', '#FCCC0C']
    ])('is a Lucide bulb, filled when on, in primary in %s', (scheme, primary) => {
      renderDetails(
        mockCustomCard,
        { isBrightnessBoosted: true, onToggleBrightness: jest.fn() },
        scheme
      );
      expect(screen.UNSAFE_queryAllByType(Sun)).toHaveLength(0);
      expect(glyph().props).toMatchObject({ color: primary, fill: primary, strokeWidth: 1.5 });
    });

    it('is an outline in textSecondary when off', () => {
      renderDetails(mockCustomCard, { onToggleBrightness: jest.fn() });
      expect(glyph().props).toMatchObject({ color: '#55555F', fill: 'none' });
    });

    it('stays a full-size tap target despite carrying only a 24 pt glyph', () => {
      renderDetails(mockCustomCard, { onToggleBrightness: jest.fn() });
      expect(flat(bulb())).toMatchObject({ width: 48, height: 48 });
    });

    it('scales to 0.98 while held, as every restyled control does', () => {
      renderDetails(mockCustomCard, { onToggleBrightness: jest.fn() });

      fireEvent(bulb(), 'pressIn');
      expect(flat(bulb()).transform).toEqual([{ scale: 0.98 }]);
      fireEvent(bulb(), 'pressOut');
      expect(flat(bulb()).transform).toBeUndefined();
    });

    it('renders no caption, and keeps a spoken label — the only thing a screen reader has', () => {
      renderDetails(mockCustomCard, { onToggleBrightness: jest.fn() });

      expect(screen.queryByText('Full brightness')).toBeNull();
      expect(bulb().props.accessibilityLabel).toBe('Full brightness');
      expect(bulb().props.accessibilityHint).toBe(
        'Sets the screen to full brightness so a scanner can read the barcode'
      );
    });

    it('announces itself as a switch, with its state', () => {
      const view = renderDetails(mockCustomCard, {
        isBrightnessBoosted: true,
        onToggleBrightness: jest.fn()
      });
      expect(bulb().props.accessibilityRole).toBe('switch');
      expect(bulb().props.accessibilityState).toEqual(expect.objectContaining({ checked: true }));
      view.unmount();

      renderDetails(mockCustomCard, { onToggleBrightness: jest.fn() });
      expect(bulb().props.accessibilityState).toEqual(expect.objectContaining({ checked: false }));
    });
  });

  describe('the details card', () => {
    it.each<[Scheme, string, string]>([
      ['light', '#FFFFFF', '#D6D6CB'],
      ['dark', '#181824', '#3A3A48']
    ])('is a divided surface in %s', (scheme, fill, rule) => {
      renderDetails(mockCustomCard, {}, scheme);
      expect(flat(screen.getByTestId('card-details-info-section'))).toMatchObject({
        backgroundColor: fill,
        borderColor: rule,
        borderRadius: 16
      });
      // Number, Color and Added: two rules between three rows.
      expect(screen.getAllByTestId('card-details-info-section-divider')).toHaveLength(2);
    });

    describe('Number', () => {
      it('groups an all-digit number in fours, in monoCode', () => {
        renderDetails();
        const row = screen.getByTestId('card-details-barcode-number');
        const value = within(row).getByText('1234 5678 9012 8');

        expect(row.props.accessibilityLabel).toBe('Number: 1234 5678 9012 8');
        expect(flat(value)).toMatchObject(TYPOGRAPHY.monoCode);
      });

      // Grouping only helps digits read aloud: a QR code's URL or an alphanumeric Code 128 is
      // shown — and spoken — exactly as it is.
      it.each([
        ['a QR code’s URL', 'QR', 'https://example.com/card?id=12345'],
        ['an alphanumeric Code 128', 'CODE128', 'ABC123XYZ456']
      ] as const)('shows %s as it is', (_label, barcodeFormat, barcode) => {
        renderDetails({ ...mockCustomCard, barcodeFormat, barcode });
        expect(screen.getByTestId('card-details-barcode-number').props.accessibilityLabel).toBe(
          `Number: ${barcode}`
        );
        expect(screen.getByText(barcode)).toBeTruthy();
      });

      it('copies the number with a success haptic, then reports it for the toast', async () => {
        const onCopy = jest.fn();
        renderDetails(mockCustomCard, { onCopy });
        const row = screen.getByTestId('card-details-barcode-number');

        expect(row.props.accessibilityHint).toBe('Double tap to copy barcode number');
        fireEvent.press(row);

        await waitFor(() => expect(onCopy).toHaveBeenCalledTimes(1));
        // The raw payload, not the grouped one on screen.
        expect(Clipboard.setStringAsync).toHaveBeenCalledWith('1234567890128');
        expect(Haptics.notificationAsync).toHaveBeenCalledWith(
          Haptics.NotificationFeedbackType.Success
        );
      });

      it('shows the existing alert, and nothing else, when the copy fails', async () => {
        (Clipboard.setStringAsync as jest.Mock).mockRejectedValueOnce(new Error('Clipboard error'));
        const onCopy = jest.fn();
        renderDetails(mockCustomCard, { onCopy });

        fireEvent.press(screen.getByTestId('card-details-barcode-number'));

        await waitFor(() =>
          expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to copy barcode to clipboard')
        );
        expect(logger.error).toHaveBeenCalledWith('Failed to copy barcode:', expect.any(Error));
        expect(Haptics.notificationAsync).not.toHaveBeenCalled();
        expect(onCopy).not.toHaveBeenCalled();
      });
    });

    describe('Color', () => {
      // The label describes the swatch, not the frozen `blue` key (Story 21.2a, AC5).
      it('names a custom card’s accent, and draws no swatch', () => {
        renderDetails();
        const row = screen.getByTestId('card-details-color');

        expect(within(row).getByText('Deep blue')).toBeTruthy();
        // A label and a value — nothing else in the row.
        expect(row.children).toHaveLength(2);
      });

      it('names an unknown colour key as the default accent, which the field falls back to', () => {
        renderDetails({ ...mockCustomCard, color: 'purple' as LoyaltyCard['color'] });
        expect(within(screen.getByTestId('card-details-color')).getByText('Azure')).toBeTruthy();
      });

      it('is absent for a catalogue card, whose colour is its brand’s', () => {
        renderDetails(mockCatalogueCard);
        expect(screen.queryByTestId('card-details-color')).toBeNull();
        expect(screen.queryByText('Red')).toBeNull();
      });

      it('shows for a card whose brand the catalogue no longer has', () => {
        renderDetails({ ...mockCatalogueCard, brandId: 'gone-from-the-catalogue' });
        expect(within(screen.getByTestId('card-details-color')).getByText('Red')).toBeTruthy();
      });
    });

    it('keeps Added on its formatter', () => {
      renderDetails();
      expect(within(screen.getByTestId('card-details-date')).getByText('Jan 7, 2026')).toBeTruthy();
    });
  });

  describe('MANAGE', () => {
    const rows = () => screen.UNSAFE_getAllByType(ActionRow);

    it('heads two plain rows in a divided surface', () => {
      renderDetails();
      const manage = screen.getByTestId('card-details-manage-section');

      expect(within(manage).getByRole('header', { name: 'Manage' })).toBeTruthy();
      expect(within(manage).getByTestId('card-details-manage-rows')).toBeTruthy();
      expect(screen.getAllByTestId('card-details-manage-rows-divider')).toHaveLength(1);
      expect(rows().map((row) => row.props)).toEqual([
        expect.objectContaining({
          testID: 'card-details-edit-row',
          variant: 'plain',
          showBottomBorder: false,
          label: 'Edit card'
        }),
        expect.objectContaining({
          testID: 'card-details-delete-row',
          variant: 'plain',
          showBottomBorder: false,
          destructive: true,
          showChevron: false,
          label: 'Delete card'
        })
      ]);
      // Edit keeps the shared row's chevron.
      expect(rows()[0]!.props.showChevron).toBeUndefined();
    });

    it('opens the edit form from Edit', () => {
      renderDetails();
      fireEvent.press(screen.getByTestId('card-details-edit-row'));
      expect(mockPush).toHaveBeenCalledWith(`/card/${mockCustomCard.id}/edit`);
    });

    it('confirms a delete with the platform alert', () => {
      const onDelete = jest.fn();
      renderDetails(mockCustomCard, { onDelete });

      fireEvent.press(screen.getByTestId('card-details-delete-row'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Card?',
        'Are you sure you want to delete "Test Store"? This action cannot be undone.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'Delete', style: 'destructive' })
        ]),
        { cancelable: true }
      );
      expect(onDelete).not.toHaveBeenCalled();

      const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as {
        text: string;
        onPress?: () => void;
      }[];
      buttons.find((button) => button.text === 'Delete')?.onPress?.();
      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('names the delete row for a screen reader', () => {
      renderDetails();
      const row = screen.getByTestId('card-details-delete-row');
      expect(row.props.accessibilityRole).toBe('button');
      expect(row.props.accessibilityLabel).toBe('Delete card');
    });

    it('says "Deleting..." and holds both rows while a delete is in flight', () => {
      renderDetails(mockCustomCard, { isDeleting: true });

      expect(screen.getByText('Deleting...')).toBeTruthy();
      expect(screen.getByTestId('card-details-delete-row').props.accessibilityLabel).toBe(
        'Deleting card'
      );
      expect(screen.getByTestId('card-details-edit-row').props.accessibilityState?.disabled).toBe(
        true
      );
      expect(screen.getByTestId('card-details-delete-row').props.accessibilityState?.disabled).toBe(
        true
      );
    });
  });

  describe('the scroll', () => {
    const scrollView = () => screen.getByTestId('card-details-scroll');
    const scrollEvent = (y: number, velocity = 0) => ({
      nativeEvent: { contentOffset: { x: 0, y }, velocity: { x: 0, y: velocity } }
    });
    /** Lets one animation frame pass — the jest environment's `requestAnimationFrame`. */
    const nextFrame = () =>
      act(async () => {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      });

    // The hero runs under the transparent bar by design: iOS must not inset the content.
    it('lets the content run under the bar', () => {
      renderDetails();
      expect(scrollView().props.contentInsetAdjustmentBehavior).toBe('never');
    });

    // Every card can scroll far enough to condense the header — measured from the scroll view's
    // own height, which a window-sized guess could overshoot.
    it('is always tall enough to condense the header, from its own measured height', () => {
      const onScrollViewLayout = jest.fn();
      renderDetails(mockCustomCard, { onScrollViewLayout });
      expect(flat({ props: { style: scrollView().props.contentContainerStyle } }).minHeight).toBe(
        undefined
      );

      fireEvent(scrollView(), 'layout', { nativeEvent: { layout: { height: 700 } } });

      expect(
        flat({
          props: { style: screen.getByTestId('card-details-scroll').props.contentContainerStyle }
        }).minHeight
      ).toBe(700 + 248);
      expect(onScrollViewLayout).toHaveBeenCalled();
    });

    // A reload swaps the content out for the spinner and back: the card returns at rest.
    it('starts the offset from the top when it mounts', () => {
      renderDetails(mockCustomCard, { initialOffset: 500 });
      expect(offset.value).toBe(0);
    });

    it('writes every scroll into the offset the header follows', () => {
      renderDetails();
      fireEvent.scroll(scrollView(), scrollEvent(150));
      expect(offset.value).toBe(150);
    });

    describe('no resting mid-blend', () => {
      it.each([
        [210, 200],
        [223, 200],
        [224, 248],
        [240, 248]
      ])('settles a drag released with no momentum at %spt to %spt', async (from, to) => {
        renderDetails();
        fireEvent(scrollView(), 'scrollEndDrag', scrollEvent(from));

        // Not from inside the release itself — iOS reports it from UIKit's end-of-drag callback —
        // but on the next frame.
        expect(reanimated.scrollTo).not.toHaveBeenCalled();
        await nextFrame();

        expect(reanimated.scrollTo).toHaveBeenCalledTimes(1);
        expect(reanimated.scrollTo).toHaveBeenCalledWith(expect.anything(), 0, to, true);
        expect(offset.value).toBe(to);
      });

      // iOS decides whether a release decelerates separately from the velocity it reports, and
      // reports no momentum at all when it does not: such a release rests where it is let go.
      it('settles a release that reports a velocity but does not decelerate', async () => {
        renderDetails();
        fireEvent(scrollView(), 'scrollEndDrag', scrollEvent(230, -0.05));
        await nextFrame();

        expect(reanimated.scrollTo).toHaveBeenCalledTimes(1);
        expect(reanimated.scrollTo).toHaveBeenCalledWith(expect.anything(), 0, 248, true);
      });

      // Released inside the band with momentum — reported straight after the release on both
      // platforms — the scroll is still moving, so nothing settles until the momentum ends.
      it('waits for a fling released inside the band to come to rest, then settles it', async () => {
        renderDetails();
        fireEvent(scrollView(), 'scrollEndDrag', scrollEvent(230, -1.2));
        fireEvent(scrollView(), 'momentumScrollBegin', scrollEvent(230, -1.2));
        await nextFrame();
        expect(reanimated.scrollTo).not.toHaveBeenCalled();

        fireEvent(scrollView(), 'momentumScrollEnd', scrollEvent(236));
        expect(reanimated.scrollTo).toHaveBeenCalledTimes(1);
        expect(reanimated.scrollTo).toHaveBeenCalledWith(expect.anything(), 0, 248, true);
      });

      // A fling's momentum is that release's alone: the next release, with none, still settles.
      it('settles a release with no momentum that follows a fling', async () => {
        renderDetails();
        fireEvent(scrollView(), 'scrollEndDrag', scrollEvent(230, -1.2));
        fireEvent(scrollView(), 'momentumScrollBegin', scrollEvent(230, -1.2));
        fireEvent(scrollView(), 'momentumScrollEnd', scrollEvent(236));
        await nextFrame();
        expect(reanimated.scrollTo).toHaveBeenLastCalledWith(expect.anything(), 0, 248, true);

        fireEvent(scrollView(), 'scrollBeginDrag', scrollEvent(248));
        fireEvent(scrollView(), 'scrollEndDrag', scrollEvent(215));
        await nextFrame();

        expect(reanimated.scrollTo).toHaveBeenCalledTimes(2);
        expect(reanimated.scrollTo).toHaveBeenLastCalledWith(expect.anything(), 0, 200, true);
      });

      // On Android a touch that stops a moving scroll cancels its animator, which reports a
      // momentum end mid-band while the finger is still down: settling then would fight the finger.
      it('does not settle a momentum end that arrives during a drag', async () => {
        renderDetails();
        fireEvent(scrollView(), 'scrollBeginDrag', scrollEvent(230));
        fireEvent(scrollView(), 'momentumScrollEnd', scrollEvent(230));
        await nextFrame();
        expect(reanimated.scrollTo).not.toHaveBeenCalled();

        // The finger lifts with momentum; that scroll's own end settles as usual, once.
        fireEvent(scrollView(), 'scrollEndDrag', scrollEvent(232, -0.8));
        fireEvent(scrollView(), 'momentumScrollBegin', scrollEvent(232, -0.8));
        fireEvent(scrollView(), 'momentumScrollEnd', scrollEvent(212));
        await nextFrame();
        expect(reanimated.scrollTo).toHaveBeenCalledTimes(1);
        expect(reanimated.scrollTo).toHaveBeenCalledWith(expect.anything(), 0, 200, true);
      });

      it.each([0, 120, 200, 248, 600])(
        'leaves a scroll resting at %spt exactly where it stops',
        async (y) => {
          renderDetails();
          act(() => {
            fireEvent(scrollView(), 'scrollEndDrag', scrollEvent(y));
            fireEvent(scrollView(), 'momentumScrollEnd', scrollEvent(y));
          });
          await nextFrame();
          expect(reanimated.scrollTo).not.toHaveBeenCalled();
          expect(offset.value).toBe(y);
        }
      );

      // Android scrolls in whole pixels: one physical pixel short of 248 is already condensed.
      it('treats one physical pixel short of 248 as condensed', () => {
        setWindow(393, 3);
        renderDetails();
        fireEvent(scrollView(), 'momentumScrollEnd', scrollEvent(248 - 1 / 3));
        expect(reanimated.scrollTo).not.toHaveBeenCalled();
      });
    });
  });
});
