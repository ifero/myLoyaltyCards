/**
 * BarcodeFlash Component Tests
 * Story 2.5: Display Barcode (Barcode Flash)
 * Story 22.4: Barcode Flash — frames A and B, the one view both hosts show
 *
 * Also carries what still holds of the suite of `FullscreenBarcode`, the copy card detail used to
 * present until this view replaced it: the white field, the name as a heading, brightness on and
 * off with the view, no brightness hint, and a copy that copies the raw value with a success haptic
 * and logs a failure.
 *
 * Two global mocks are upgraded here, for the whole file. The global `useAnimatedStyle` returns
 * `{}`, which shows nothing of the content's motion; here it returns the style its worklet
 * evaluates to whenever it is read, so the content's opacity and slide are seen as the device
 * applies them. And the window is set through `Dimensions.set`, the call the native side makes on a
 * change, so the view can be seen following one while it is mounted.
 */

import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
  within
} from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { BackHandler, Dimensions, Image, StyleSheet, Text } from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Svg from 'react-native-svg';

import type { BarcodeFormat, LoyaltyCard } from '@/core/schemas';
import { logger } from '@/core/utils/logger';

import { TYPOGRAPHY } from '@/shared/theme/typography';

import { StoryDecorator } from '@/.storybook/StoryDecorator';

import {
  BarcodeFlash,
  FADE_IN_MS,
  FADE_OUT_MS,
  LINEAR_BOX_HEIGHT,
  SLIDE_OUT_MS,
  SWIPE_CLOSE_DISTANCE,
  SWIPE_CLOSE_VELOCITY,
  getBarcodeBoxWidth,
  shouldSwipeClose,
  type BarcodeFlashHandle
} from './BarcodeFlash';

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success' }
}));

const mockMaximize = jest.fn().mockResolvedValue(undefined);
const mockRestore = jest.fn().mockResolvedValue(undefined);
jest.mock('../hooks/useBrightness', () => ({
  useBrightness: () => ({ maximize: mockMaximize, restore: mockRestore })
}));

// Whether the view's screen is the focused one: false once another screen is pushed over it.
let mockIsFocused = true;
jest.mock('expo-router', () => ({
  useIsFocused: () => mockIsFocused
}));

// The frames' real insets on a 393 × 852 phone: 59pt over the status bar, 34pt over the home
// indicator. The provider stays real, for `StoryDecorator`.
const INSETS = { top: 59, bottom: 34, left: 0, right: 0 };
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => INSETS
}));

// The bars need native modules; what matters here is what the view asks the renderer for. It
// labels itself as the real one does, so the box's label can be seen to be the renderer's.
const mockBarcodeRenderer = jest.fn();
jest.mock('./BarcodeRenderer', () => ({
  BarcodeRenderer: (props: { value: string; format: string }) => {
    mockBarcodeRenderer(props);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View } = require('react-native');
    return (
      <View
        testID="barcode-renderer"
        accessibilityRole="image"
        accessibilityLabel={`${props.format} barcode for ${props.value}`}
      />
    );
  }
}));

const reanimated: { withTiming: jest.Mock; useAnimatedStyle: jest.Mock } =
  jest.requireMock('react-native-reanimated');
const gestureHandler: { Gesture: { Pan: () => unknown } } = jest.requireMock(
  'react-native-gesture-handler'
);

const mockCard: LoyaltyCard = {
  id: 'test-id-123',
  name: 'Test Store Card',
  barcode: '1234567890123',
  barcodeFormat: 'EAN13',
  brandId: null,
  color: 'blue',
  isFavorite: false,
  lastUsedAt: null,
  usageCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

const qrCard: LoyaltyCard = {
  ...mockCard,
  name: 'Farmacia Centrale',
  barcode: 'https://example.com/card?id=12345',
  barcodeFormat: 'QR'
};

const INK = '#181824';
const MUTED = '#55555F';
const WHITE = '#FFFFFF';
const SHADOW_AND_PLATE_KEYS = [
  'shadowColor',
  'shadowOffset',
  'shadowOpacity',
  'shadowRadius',
  'elevation',
  'borderRadius',
  'borderWidth',
  'borderColor',
  'backgroundColor'
];

const INITIAL_WINDOW = Dimensions.get('window');
const INITIAL_SCREEN = Dimensions.get('screen');

/** Sets the window as the native side reports a change: a mounted view hears it too. */
const setWindow = (width: number, height = 852) => {
  const window = { width, height, scale: 3, fontScale: 1 };
  act(() => {
    Dimensions.set({ window, screen: window });
  });
};

/**
 * The style an animated style's worklet evaluates to, each time it is read — as the UI thread
 * applies every write to a shared value, so a write made after the render, such as the fade an
 * effect starts, shows without another render.
 */
const liveStyle = (updater: () => Record<string, unknown>) => {
  const style: Record<string, unknown> = {};
  for (const key of Object.keys(updater())) {
    Object.defineProperty(style, key, { enumerable: true, get: () => updater()[key] });
  }
  return style;
};

const flat = (element: { props: { style: unknown } }) =>
  StyleSheet.flatten(element.props.style as never) as Record<string, unknown>;

/** The content layer as it is drawn now: its opacity and its slide. */
const content = () => flat(screen.getByTestId('barcode-flash'));

const renderFlash = (card: LoyaltyCard = mockCard, onDismiss: () => void = jest.fn()) =>
  render(<BarcodeFlash card={card} onDismiss={onDismiss} />);

/**
 * The pan, and its two callbacks, recorded for one render — the gesture mock otherwise drops them.
 */
type PanEvent = { translationY: number; velocityY: number };
const recordPan = () => {
  const recorded: {
    gesture?: unknown;
    update?: (event: PanEvent) => void;
    end?: (event: PanEvent) => void;
  } = {};
  jest.spyOn(gestureHandler.Gesture, 'Pan').mockImplementation(() => {
    const pan = {
      onUpdate(callback: (event: PanEvent) => void) {
        recorded.update = callback;
        return pan;
      },
      onEnd(callback: (event: PanEvent) => void) {
        recorded.end = callback;
        return pan;
      }
    };
    recorded.gesture = pan;
    return pan;
  });
  return recorded;
};

/**
 * The view's Android back listeners. Jest resolves `BackHandler` to iOS's, which never calls one;
 * a press here runs them as Android does — the last registered first, until one takes it — and
 * reports whether one did. One that did not would leave the press to expo-router, which pops.
 */
const recordBack = () => {
  const listeners: Array<() => boolean | null | undefined> = [];
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_eventName, listener) => {
    listeners.push(listener);
    return {
      remove: () => {
        listeners.splice(listeners.indexOf(listener), 1);
      }
    };
  });
  const press = () => [...listeners].reverse().some((listener) => listener() === true);
  return { listeners, press };
};

/**
 * Holds every animation's end. Each still reaches its value at once, as the global mock's does, but
 * its callback waits for `finishAll`: so a test sees the content gone and the host not yet asked to
 * close.
 */
const holdAnimations = () => {
  const ends: Array<(finished: boolean) => void> = [];
  const withTiming = jest
    .spyOn(reanimated, 'withTiming')
    .mockImplementation(
      (value: number, _config: unknown, callback?: (finished: boolean) => void) => {
        if (callback) {
          ends.push(callback);
        }
        return value;
      }
    );
  const finishAll = () => {
    act(() => {
      ends.splice(0).forEach((end) => end(true));
    });
  };
  return { withTiming, finishAll };
};

type HostNode = { props: { testID?: string }; children: Array<HostNode | string> | null };

/**
 * The testIDs of a view's own children, in the order they are drawn: each over the ones before it.
 * Read from the rendered tree, which holds the host views alone.
 */
const drawOrderOf = (testID: string) => {
  const find = (node: unknown): HostNode | undefined => {
    if (Array.isArray(node)) {
      return node.map(find).find(Boolean);
    }
    if (node === null || typeof node !== 'object') {
      return undefined;
    }
    const host = node as HostNode;
    return host.props.testID === testID ? host : find(host.children ?? []);
  };
  return (find(screen.toJSON())?.children ?? []).map((child) =>
    typeof child === 'string' ? child : child.props.testID
  );
};

/** What each close path is handed: the view's handle, its pan, and Android back. */
type CloseTools = {
  handle: React.RefObject<BarcodeFlashHandle | null>;
  pan: ReturnType<typeof recordPan>;
  back: ReturnType<typeof recordBack>;
};

/** The two exits, on an 852pt-tall window: the content fades out, or slides away by the window. */
type Exit = { timing: [number, { duration: number }]; style: Record<string, unknown> };
const FADE_OUT: Exit = { timing: [0, { duration: FADE_OUT_MS }], style: { opacity: 0 } };
const SLIDE_OUT: Exit = {
  timing: [852, { duration: SLIDE_OUT_MS }],
  style: { opacity: 1, transform: [{ translateY: 852 }] }
};

// The number's tap goes through `userEvent`, which presses the number's own responder.
// `fireEvent.press` climbs to the nearest `onPress`, so it would reach the stack's had the number
// lost its own.
const CLOSE_PATHS: Array<[string, Exit, (tools: CloseTools) => void | Promise<void>]> = [
  [
    'a tap on the close target',
    FADE_OUT,
    () => fireEvent.press(screen.getByTestId('barcode-flash-close'))
  ],
  ['a tap on the name', FADE_OUT, () => fireEvent.press(screen.getByText('Test Store Card'))],
  ['a tap on the code', FADE_OUT, () => fireEvent.press(screen.getByTestId('barcode-renderer'))],
  [
    'a tap on the number',
    FADE_OUT,
    () => userEvent.press(screen.getByTestId('barcode-flash-number'))
  ],
  [
    'a tap on the hint',
    FADE_OUT,
    () =>
      fireEvent.press(screen.getByText('Tap anywhere to close', { includeHiddenElements: true }))
  ],
  [
    'VoiceOver’s escape gesture',
    FADE_OUT,
    () => fireEvent(screen.getByTestId('barcode-flash'), 'accessibilityEscape')
  ],
  [
    'Android back',
    FADE_OUT,
    ({ back }) =>
      act(() => {
        back.press();
      })
  ],
  [
    'the host’s close()',
    FADE_OUT,
    ({ handle }) =>
      act(() => {
        handle.current?.close();
      })
  ],
  [
    'a swipe down',
    SLIDE_OUT,
    ({ pan }) =>
      act(() => {
        pan.end?.({ translationY: 300, velocityY: 0 });
      })
  ]
];

describe('BarcodeFlash', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(reanimated, 'useAnimatedStyle').mockImplementation(liveStyle);
    mockIsFocused = true;
  });

  afterEach(() => {
    act(() => {
      Dimensions.set({ window: INITIAL_WINDOW, screen: INITIAL_SCREEN });
    });
    jest.restoreAllMocks();
  });

  describe('frames A and B: the stack', () => {
    it('heads it with the store name, a heading in headlineSm ink, two lines at most', () => {
      renderFlash();
      const name = screen.getByTestId('barcode-flash-name');

      expect(name.props.children).toBe('Test Store Card');
      expect(name.props.accessibilityRole).toBe('header');
      expect(name.props.numberOfLines).toBe(2);
      expect(flat(name)).toMatchObject({
        ...TYPOGRAPHY.headlineSm,
        color: INK,
        textAlign: 'center',
        marginBottom: 24
      });
    });

    it('draws a linear code bare in a box min(0.8 × window, 320) wide and 200 tall, its bars filling it', () => {
      setWindow(393);
      renderFlash();
      const box = screen.getByTestId('barcode-flash-code');

      expect(mockBarcodeRenderer).toHaveBeenLastCalledWith(
        expect.objectContaining({
          value: '1234567890123',
          format: 'EAN13',
          width: 393 * 0.8,
          height: 200,
          fillBox: true,
          color: '#000000',
          backgroundColor: WHITE
        })
      );
      expect(flat(box)).toMatchObject({ width: 393 * 0.8, height: 200 });
      // Nothing around the code: no plate, border, radius, shadow or tint.
      for (const key of SHADOW_AND_PLATE_KEYS) {
        expect(flat(box)[key]).toBeUndefined();
      }
    });

    it('draws a QR code in a square box as wide as a linear one', () => {
      setWindow(393);
      renderFlash(qrCard);

      expect(mockBarcodeRenderer).toHaveBeenLastCalledWith(
        expect.objectContaining({ format: 'QR', width: 393 * 0.8, height: 393 * 0.8 })
      );
      expect(flat(screen.getByTestId('barcode-flash-code'))).toMatchObject({
        width: 393 * 0.8,
        height: 393 * 0.8
      });
    });

    it('never makes the box wider than 320', () => {
      setWindow(440);
      renderFlash();
      expect(mockBarcodeRenderer).toHaveBeenLastCalledWith(
        expect.objectContaining({ width: 320, height: LINEAR_BOX_HEIGHT })
      );
      expect(getBarcodeBoxWidth(393)).toBeCloseTo(314.4);
      expect(getBarcodeBoxWidth(440)).toBe(320);
    });

    // The same mounted view, before and after the window changes under it — a rotation, a split
    // screen. A width read once, at mount or at module scope, would keep the first box.
    it('follows the window while it shows, rather than reading it once', () => {
      setWindow(320);
      renderFlash();
      expect(mockBarcodeRenderer).toHaveBeenLastCalledWith(expect.objectContaining({ width: 256 }));
      expect(flat(screen.getByTestId('barcode-flash-code'))).toMatchObject({ width: 256 });

      setWindow(393);
      expect(mockBarcodeRenderer).toHaveBeenLastCalledWith(
        expect.objectContaining({ width: 393 * 0.8 })
      );
      expect(flat(screen.getByTestId('barcode-flash-code'))).toMatchObject({
        width: 393 * 0.8,
        height: 200
      });
    });

    it.each<BarcodeFormat>(['CODE128', 'EAN13', 'EAN8', 'CODE39', 'UPCA'])(
      'draws a %s code through the renderer, filling a 200pt box',
      (barcodeFormat) => {
        renderFlash({ ...mockCard, barcodeFormat });
        expect(mockBarcodeRenderer).toHaveBeenLastCalledWith(
          expect.objectContaining({ format: barcodeFormat, height: 200, fillBox: true })
        );
      }
    );

    it('shows the number exactly as stored, never grouped, in monoCode ink, three lines at most', () => {
      renderFlash();
      const number = screen.getByText('1234567890123');

      expect(screen.queryByText('1234 5678 9012 3')).toBeNull();
      expect(number.props.numberOfLines).toBe(3);
      // `monoCode` as the design system has it: no extra tracking.
      expect(flat(number)).toMatchObject({
        ...TYPOGRAPHY.monoCode,
        letterSpacing: 0,
        color: INK,
        textAlign: 'center'
      });
    });

    it('shows a QR code’s URL as it is', () => {
      renderFlash(qrCard);
      expect(screen.getByText('https://example.com/card?id=12345')).toBeTruthy();
    });

    // Far past three lines of mono-code: on screen it is cut with an ellipsis, and its spoken
    // label and the copy carry it whole.
    it('keeps a payload longer than three lines to three on screen, and whole in its label', async () => {
      const value = `https://example.com/loyalty/members/${'A1B2C3D4E5F6G7H8'.repeat(10)}`;
      renderFlash({ ...qrCard, barcode: value });
      const number = screen.getByTestId('barcode-flash-number');

      expect(screen.getByText(value).props.numberOfLines).toBe(3);
      expect(number.props.accessibilityLabel).toBe(
        `Barcode number for Farmacia Centrale: ${value}`
      );

      fireEvent(number, 'longPress');
      await waitFor(() => expect(Clipboard.setStringAsync).toHaveBeenCalledWith(value));
    });

    it('keeps the frames’ spacing — 24, 16, 40 — while the number keeps a 48pt target', () => {
      renderFlash();
      const target = flat(screen.getByTestId('barcode-flash-number'));
      const hint = flat(screen.getByTestId('barcode-flash-hint', { includeHiddenElements: true }));
      const lineHeight = TYPOGRAPHY.monoCode.lineHeight;

      expect(flat(screen.getByTestId('barcode-flash-name')).marginBottom).toBe(24);
      // From the code to the number's text, and from the text to the hint.
      expect((target.marginTop as number) + (target.paddingVertical as number)).toBe(16);
      expect((target.paddingVertical as number) + (hint.marginTop as number)).toBe(40);
      expect(lineHeight + 2 * (target.paddingVertical as number)).toBe(48);
      expect(target).toMatchObject({ minWidth: 48, minHeight: 48 });
    });

    it('ends on the hint, in captionLg, the light scheme’s muted text', () => {
      renderFlash();
      const hint = screen.getByTestId('barcode-flash-hint', { includeHiddenElements: true });

      expect(hint.props.children).toBe('Tap anywhere to close');
      expect(flat(hint)).toMatchObject({
        ...TYPOGRAPHY.captionLg,
        color: MUTED,
        textAlign: 'center'
      });
    });

    // The one button is the full-screen close target behind the stack, which draws nothing: no
    // close ×, icon, logo, brightness hint or toast is added beside the code and its labels.
    it('draws only the name, the code, the number and the hint, and no button but the close target', () => {
      renderFlash();
      const texts = screen
        .UNSAFE_getAllByType(Text)
        .map((text) => text.props.children as unknown)
        .filter((children) => typeof children === 'string');

      expect(texts).toEqual(['Test Store Card', '1234567890123', 'Tap anywhere to close']);
      // No image or icon: the code is the mocked renderer, a plain view here.
      expect(screen.UNSAFE_queryAllByType(Image)).toHaveLength(0);
      expect(screen.UNSAFE_queryAllByType(Svg)).toHaveLength(0);
      expect(screen.getAllByRole('button').map((button) => button.props.testID)).toStrictEqual([
        'barcode-flash-close'
      ]);
      // Story 16.39: it maximises brightness itself, so it never asks the user to.
      expect(screen.queryByText('Increase brightness for scanning')).toBeNull();
      expect(screen.queryByTestId('fullscreen-barcode-brightness-hint')).toBeNull();
    });
  });

  describe('the white field', () => {
    it.each<'light' | 'dark'>(['light', 'dark'])(
      'is white edge to edge, its text in the light scheme’s fixed roles, in %s',
      (scheme) => {
        render(
          <StoryDecorator theme={scheme}>
            <BarcodeFlash card={mockCard} onDismiss={jest.fn()} />
          </StoryDecorator>
        );
        const ground = flat(screen.UNSAFE_getByType(GestureHandlerRootView));

        // The ground fills the screen with no inset of its own: white under both system bars.
        expect(ground).toEqual({ flex: 1, backgroundColor: WHITE });
        expect(flat(screen.getByTestId('barcode-flash-name')).color).toBe(INK);
        expect(flat(screen.getByText('1234567890123')).color).toBe(INK);
        expect(
          flat(screen.getByTestId('barcode-flash-hint', { includeHiddenElements: true })).color
        ).toBe(MUTED);
      }
    );

    it('keeps the content clear of the status bar and home indicator, on 24pt margins', () => {
      renderFlash();
      const body = screen.getByTestId('barcode-flash-body');

      expect(body.props.pointerEvents).toBe('box-none');
      expect(flat(body)).toMatchObject({
        paddingTop: INSETS.top,
        paddingBottom: INSETS.bottom,
        paddingHorizontal: 24,
        alignItems: 'center'
      });
    });

    // Auto margins centre the group while it fits, and collapse when it cannot — at the largest
    // text sizes — so it starts at the top inset rather than spilling under the clock.
    it('centres the group between the insets by its auto margins, never by spilling over the top', () => {
      renderFlash();

      expect(flat(screen.getByTestId('barcode-flash-stack')).marginVertical).toBe('auto');
      expect(flat(screen.getByTestId('barcode-flash-body')).justifyContent).toBeUndefined();
    });

    it('mounts a dark status bar for the white', () => {
      renderFlash();
      expect(screen.UNSAFE_getByType(StatusBar).props.style).toBe('dark');
    });

    it('fades the content in, over Story 2.5’s 200ms, for a host that does not hold it back', () => {
      const withTiming = jest.spyOn(reanimated, 'withTiming');
      renderFlash();

      expect(withTiming).toHaveBeenCalledWith(1, { duration: FADE_IN_MS });
      expect(FADE_IN_MS).toBe(200);
      expect(content()).toMatchObject({ opacity: 1, transform: [{ translateY: 0 }] });
    });

    // A host's own fade brings in the whole screen over the one beneath it: content drawn during it
    // would have that screen behind the code. So the content waits, and the fade brings in white.
    it('holds the content back until the host has presented the view, then fades it in', () => {
      const withTiming = jest.spyOn(reanimated, 'withTiming');
      const onDismiss = jest.fn();
      const view = render(
        <BarcodeFlash card={mockCard} onDismiss={onDismiss} isPresented={false} />
      );

      expect(content().opacity).toBe(0);
      expect(withTiming).not.toHaveBeenCalledWith(1, expect.anything());
      // The status bar does not wait: it comes with the view.
      expect(screen.UNSAFE_getByType(StatusBar).props.style).toBe('dark');

      view.rerender(<BarcodeFlash card={mockCard} onDismiss={onDismiss} isPresented />);
      expect(withTiming).toHaveBeenCalledWith(1, { duration: FADE_IN_MS });
      expect(content().opacity).toBe(1);
    });

    // Brightness comes with the view, not with its content, so the flip that lets the content in
    // leaves it alone. Tied to the flip, it would restore the level from before the view and then
    // maximise again: with card detail's setting off, the user's level written, then 1.0 over it.
    it('maximises brightness with the view, and leaves it alone when the content comes in', () => {
      const onDismiss = jest.fn();
      const view = render(
        <BarcodeFlash card={mockCard} onDismiss={onDismiss} isPresented={false} />
      );
      expect(mockMaximize).toHaveBeenCalledTimes(1);

      view.rerender(<BarcodeFlash card={mockCard} onDismiss={onDismiss} isPresented />);

      expect(content().opacity).toBe(1);
      expect(mockMaximize).toHaveBeenCalledTimes(1);
      expect(mockRestore).not.toHaveBeenCalled();
    });

    it('does not fade the content back in for a host that finishes presenting after a close', () => {
      const withTiming = jest.spyOn(reanimated, 'withTiming');
      const onDismiss = jest.fn();
      const view = render(
        <BarcodeFlash card={mockCard} onDismiss={onDismiss} isPresented={false} />
      );

      fireEvent.press(screen.getByTestId('barcode-flash-close'));
      view.rerender(<BarcodeFlash card={mockCard} onDismiss={onDismiss} isPresented />);

      expect(withTiming).not.toHaveBeenCalledWith(1, expect.anything());
      expect(content().opacity).toBe(0);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    // The swipe is a close like any other. A host that reports it has finished presenting during
    // the slide — a swipe begun while card detail's modal was still fading in — must not bring the
    // content back while it slides away.
    it('marks the view closing on a swipe, so a reveal that comes after it shows nothing', () => {
      setWindow(393, 852);
      const pan = recordPan();
      const { withTiming, finishAll } = holdAnimations();
      const onDismiss = jest.fn();
      const view = render(
        <BarcodeFlash card={mockCard} onDismiss={onDismiss} isPresented={false} />
      );

      act(() => {
        pan.end?.({ translationY: 300, velocityY: 0 });
      });
      view.rerender(<BarcodeFlash card={mockCard} onDismiss={onDismiss} isPresented />);

      expect(withTiming).not.toHaveBeenCalledWith(1, expect.anything());
      expect(content()).toMatchObject({ opacity: 0, transform: [{ translateY: 852 }] });
      expect(onDismiss).not.toHaveBeenCalled();

      finishAll();
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('brightness (Story 2.5)', () => {
    it('maximises brightness when it mounts', () => {
      renderFlash();
      expect(mockMaximize).toHaveBeenCalledTimes(1);
      expect(mockRestore).not.toHaveBeenCalled();
    });

    it('restores brightness when it unmounts', () => {
      const view = renderFlash();
      view.unmount();
      expect(mockRestore).toHaveBeenCalledTimes(1);
    });
  });

  describe('closing', () => {
    it('closes on a tap anywhere: the content fades out over 150ms, then the host closes', () => {
      const withTiming = jest.spyOn(reanimated, 'withTiming');
      const onDismiss = jest.fn();
      renderFlash(mockCard, onDismiss);

      fireEvent.press(screen.getByTestId('barcode-flash-close'));

      expect(withTiming).toHaveBeenLastCalledWith(
        0,
        { duration: FADE_OUT_MS },
        expect.any(Function)
      );
      expect(FADE_OUT_MS).toBe(150);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    // Every way out runs the content's exit over the white, and only once that exit has ended is
    // the host asked to close: never the code over the screen beneath, nor the screen beneath
    // cut to with the code still on it.
    it.each(CLOSE_PATHS)(
      '%s runs the content’s exit over the white before the host closes',
      async (_path, exit, close) => {
        setWindow(393, 852);
        const pan = recordPan();
        const back = recordBack();
        const { withTiming, finishAll } = holdAnimations();
        const handle = React.createRef<BarcodeFlashHandle>();
        const onDismiss = jest.fn();
        render(<BarcodeFlash ref={handle} card={mockCard} onDismiss={onDismiss} />);
        expect(content()).toMatchObject({ opacity: 1, transform: [{ translateY: 0 }] });

        await close({ handle, pan, back });

        expect(withTiming).toHaveBeenLastCalledWith(...exit.timing, expect.any(Function));
        expect(content()).toMatchObject(exit.style);
        expect(onDismiss).not.toHaveBeenCalled();
        // The ground is no part of the exit: it stays white, and stays where it is.
        expect(flat(screen.UNSAFE_getByType(GestureHandlerRootView))).toEqual({
          flex: 1,
          backgroundColor: WHITE
        });

        finishAll();
        expect(onDismiss).toHaveBeenCalledTimes(1);
      }
    );

    // On the route, Android back reaches this listener before expo-router's, which would pop the
    // screen with the code still on it. So the view takes the press — and any press during its
    // exit, so the route pops once — until it unmounts.
    it('takes Android back itself, every press of it, until it unmounts', () => {
      const back = recordBack();
      const { finishAll } = holdAnimations();
      const onDismiss = jest.fn();
      const view = renderFlash(mockCard, onDismiss);
      expect(back.listeners).toHaveLength(1);

      const presses: boolean[] = [];
      act(() => {
        presses.push(back.press());
      });
      act(() => {
        presses.push(back.press());
      });
      expect(presses).toEqual([true, true]);
      expect(onDismiss).not.toHaveBeenCalled();

      finishAll();
      expect(onDismiss).toHaveBeenCalledTimes(1);

      view.unmount();
      expect(back.listeners).toHaveLength(0);
    });

    // On the route, a second `cardi://` link pushes another screen over this one. Android back is
    // then that screen's: taken here, it would spend the view's one close and pop the screen on
    // top, leaving this one blank. So the view leaves it to expo-router until it is back on top.
    it('takes Android back only while its screen is focused', () => {
      const back = recordBack();
      const { withTiming, finishAll } = holdAnimations();
      const onDismiss = jest.fn();
      mockIsFocused = false;
      const view = renderFlash(mockCard, onDismiss);

      const presses: boolean[] = [];
      act(() => {
        presses.push(back.press());
      });
      expect(presses).toEqual([false]);
      expect(withTiming).not.toHaveBeenCalledWith(0, expect.anything(), expect.anything());
      expect(content().opacity).toBe(1);

      mockIsFocused = true;
      view.rerender(<BarcodeFlash card={mockCard} onDismiss={onDismiss} />);
      act(() => {
        presses.push(back.press());
      });
      expect(presses).toEqual([false, true]);
      finishAll();
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    // Later siblings draw over earlier ones. The close target comes first, so it sits behind the
    // stack: a long press on the number reaches the number, and copies, rather than closing.
    it('orders the full-screen close target behind the content', () => {
      renderFlash();

      expect(drawOrderOf('barcode-flash')).toStrictEqual([
        'barcode-flash-close',
        'barcode-flash-body'
      ]);
      for (const testID of ['barcode-flash-close', 'barcode-flash-body']) {
        expect(flat(screen.getByTestId(testID))).not.toHaveProperty('zIndex');
        expect(flat(screen.getByTestId(testID))).not.toHaveProperty('elevation');
      }
    });

    // Pressed through its own responder, as a finger does: `fireEvent.press` would climb to the
    // stack's `onPress` and pass even if the number lost its own.
    it('closes on a tap on the number, without copying it', async () => {
      const onDismiss = jest.fn();
      renderFlash(mockCard, onDismiss);
      await userEvent.press(screen.getByTestId('barcode-flash-number'));
      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(Clipboard.setStringAsync).not.toHaveBeenCalled();
    });

    // The pan drives the content layer, so the whole layer sits inside its detector: one round
    // the stack alone would leave the screen's open white, where most swipes start, without it.
    it('swipes the whole content layer: the pan’s detector wraps it', () => {
      const recorded = recordPan();
      renderFlash();

      expect(screen.UNSAFE_getByType(GestureDetector).props.gesture).toBe(recorded.gesture);
      expect(drawOrderOf('gesture-detector')).toStrictEqual(['barcode-flash']);
    });

    // A second tap, a swipe or Android back during the fade ends a second animation; the route's
    // `router.back()` must still run once only, or it would leave the screen beneath too.
    it('closes the host once, however many closes end', () => {
      const onDismiss = jest.fn();
      const recorded = recordPan();
      const back = recordBack();
      renderFlash(mockCard, onDismiss);

      fireEvent.press(screen.getByTestId('barcode-flash-close'));
      fireEvent.press(screen.getByTestId('barcode-flash-number'));
      act(() => recorded.end?.({ translationY: 300, velocityY: 0 }));
      act(() => {
        back.press();
      });

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('closes nothing when its fade is cut short by another', () => {
      jest
        .spyOn(reanimated, 'withTiming')
        .mockImplementation((value: number, _config: unknown, callback?: (f: boolean) => void) => {
          callback?.(false);
          return value;
        });
      const onDismiss = jest.fn();
      renderFlash(mockCard, onDismiss);

      fireEvent.press(screen.getByTestId('barcode-flash-close'));
      expect(onDismiss).not.toHaveBeenCalled();
    });

    // A host can take the view down while its exit is still running — card detail leaving, the
    // route popped from outside — and that exit's end must not call a host that has gone.
    it('does not close a host that has already gone', () => {
      let endFade: ((finished: boolean) => void) | undefined;
      jest
        .spyOn(reanimated, 'withTiming')
        .mockImplementation((value: number, _config: unknown, callback?: (f: boolean) => void) => {
          if (value === 0 && callback) {
            endFade = callback;
          }
          return value;
        });
      const onDismiss = jest.fn();
      const view = renderFlash(mockCard, onDismiss);

      fireEvent.press(screen.getByTestId('barcode-flash-close'));
      view.unmount();
      endFade?.(true);

      expect(endFade).toBeDefined();
      expect(onDismiss).not.toHaveBeenCalled();
    });

    describe('the swipe down (Story 2.5)', () => {
      it('closes past 100pt, or when flung down faster than 500pt/s, and never on the way up', () => {
        expect([SWIPE_CLOSE_DISTANCE, SWIPE_CLOSE_VELOCITY]).toEqual([100, 500]);
        expect(shouldSwipeClose(101, 0)).toBe(true);
        expect(shouldSwipeClose(100, 0)).toBe(false);
        expect(shouldSwipeClose(20, 501)).toBe(true);
        expect(shouldSwipeClose(20, 500)).toBe(false);
        expect(shouldSwipeClose(60, 200)).toBe(false);
        expect(shouldSwipeClose(-300, -2000)).toBe(false);
      });

      it('slides the content away by the window’s height over 200ms, then closes', () => {
        setWindow(393, 852);
        const withTiming = jest.spyOn(reanimated, 'withTiming');
        const recorded = recordPan();
        const onDismiss = jest.fn();
        renderFlash(mockCard, onDismiss);

        act(() => recorded.end?.({ translationY: 140, velocityY: 0 }));

        expect(withTiming).toHaveBeenLastCalledWith(
          852,
          { duration: SLIDE_OUT_MS },
          expect.any(Function)
        );
        expect(SLIDE_OUT_MS).toBe(200);
        expect(onDismiss).toHaveBeenCalledTimes(1);
      });

      it('settles the content back from a swipe that falls short, and stays open', () => {
        const withTiming = jest.spyOn(reanimated, 'withTiming');
        const recorded = recordPan();
        const onDismiss = jest.fn();
        renderFlash(mockCard, onDismiss);

        act(() => recorded.update?.({ translationY: 60, velocityY: 0 }));
        expect(content().transform).toEqual([{ translateY: 60 }]);
        act(() => recorded.end?.({ translationY: 60, velocityY: 120 }));

        expect(withTiming).toHaveBeenLastCalledWith(0, { duration: 150 });
        expect(content()).toMatchObject({ opacity: 1, transform: [{ translateY: 0 }] });
        expect(onDismiss).not.toHaveBeenCalled();
      });

      it('closes nothing when its slide is cut short by another', () => {
        jest
          .spyOn(reanimated, 'withTiming')
          .mockImplementation(
            (value: number, _config: unknown, callback?: (f: boolean) => void) => {
              callback?.(false);
              return value;
            }
          );
        const recorded = recordPan();
        const onDismiss = jest.fn();
        renderFlash(mockCard, onDismiss);

        act(() => recorded.end?.({ translationY: 300, velocityY: 0 }));
        expect(onDismiss).not.toHaveBeenCalled();
      });

      it('never lifts the content above where it rests', () => {
        const recorded = recordPan();
        renderFlash();

        act(() => recorded.update?.({ translationY: -80, velocityY: 0 }));
        expect(content().transform).toEqual([{ translateY: 0 }]);
      });
    });
  });

  describe('copying the number', () => {
    it('copies the raw number on a long press, with a success haptic, and stays open', async () => {
      const onDismiss = jest.fn();
      renderFlash(mockCard, onDismiss);

      fireEvent(screen.getByTestId('barcode-flash-number'), 'longPress');

      await waitFor(() => expect(Haptics.notificationAsync).toHaveBeenCalledWith('success'));
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith('1234567890123');
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('logs a failed copy as a warning, and never the value', async () => {
      const warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
      (Clipboard.setStringAsync as jest.Mock).mockRejectedValueOnce(new Error('fail'));
      renderFlash();

      fireEvent(screen.getByTestId('barcode-flash-number'), 'longPress');

      await waitFor(() =>
        expect(warn).toHaveBeenCalledWith('Failed to copy barcode:', expect.any(Error))
      );
      expect(JSON.stringify(warn.mock.calls)).not.toContain('1234567890123');
      expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    });
  });

  describe('screen readers', () => {
    it('closes from one full-screen button, behind the content rather than around it', () => {
      renderFlash();
      const close = screen.getByRole('button', { name: 'Dismiss barcode overlay' });

      expect(close.props.accessibilityHint).toBe('Tap anywhere to close');
      expect(close.props.testID).toBe('barcode-flash-close');
      expect(flat(close)).toMatchObject(StyleSheet.absoluteFillObject);
      // It wraps none of the content, so it hides none of it.
      for (const testID of ['barcode-flash-name', 'barcode-flash-code', 'barcode-flash-number']) {
        expect(within(close).queryByTestId(testID)).toBeNull();
        expect(screen.getByTestId(testID)).toBeTruthy();
      }
    });

    it('reads the stack item by item: it is a touch target only', () => {
      renderFlash();
      const stack = screen.getByTestId('barcode-flash-stack');

      expect(stack.props.accessible).toBe(false);
      expect(stack.props.importantForAccessibility).toBe('no');
      expect(within(stack).getByRole('header', { name: 'Test Store Card' })).toBeTruthy();
    });

    it('reads the code by the renderer’s own label', () => {
      renderFlash();
      const box = screen.getByTestId('barcode-flash-code');

      expect(box.props.accessible).toBe(true);
      expect(box.props.accessibilityRole).toBe('image');
      expect(box.props.accessibilityLabel).toBeUndefined();
      expect(within(box).getByLabelText('EAN13 barcode for 1234567890123')).toBeTruthy();
    });

    // The hint says how to copy, so the label says only what the number is: read together, they
    // would say it twice.
    it('reads the number with its copy hint, which its label does not repeat', () => {
      renderFlash();
      const number = screen.getByLabelText('Barcode number for Test Store Card: 1234567890123');

      expect(number.props.accessibilityHint).toBe('Long press to copy barcode to clipboard');
      expect(number.props.accessibilityLabel).not.toMatch(/copy/i);
    });

    it('leaves the touch hint to touch: the close button carries the same words', () => {
      renderFlash();
      const hint = screen.getByTestId('barcode-flash-hint', { includeHiddenElements: true });

      expect(hint.props.accessibilityElementsHidden).toBe(true);
      expect(hint.props.importantForAccessibility).toBe('no-hide-descendants');
      expect(screen.queryByText('Tap anywhere to close')).toBeNull();
    });
  });

  describe('Different card data', () => {
    it('renders a long store name', () => {
      const name = 'Very Long Store Name That Should Be Truncated If Too Long';
      renderFlash({ ...mockCard, name });
      expect(screen.getByText(name)).toBeTruthy();
    });

    it('renders an empty barcode without throwing', () => {
      renderFlash({ ...mockCard, barcode: '' });
      expect(screen.getByTestId('barcode-renderer')).toBeTruthy();
    });
  });
});
