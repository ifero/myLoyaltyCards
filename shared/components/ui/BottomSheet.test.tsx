/**
 * BottomSheet — Story 22.1 (AC1, AC8, AC11).
 *
 * Through the real `StoryDecorator` stack, because the sheet's spec is mostly colour: an ink
 * scrim, a white-or-ink sheet and a #D6D6CB-or-#3A3A48 grabber, flipping with the theme. The
 * decorator also supplies a deterministic 34pt bottom inset.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo, Modal, StyleSheet, Text } from 'react-native';

import {
  BottomSheet,
  SHEET_SLIDE_MS,
  getScrimOpacity,
  getSheetOffset,
  getSlideStyle
} from './BottomSheet';
import { Button } from './Button';
import { StoryDecorator } from '../../../.storybook/StoryDecorator';

type Scheme = 'light' | 'dark';
type SheetProps = Partial<React.ComponentProps<typeof BottomSheet>>;
type TimingCallback = (finished?: boolean) => void;

// The jest.setup mock completes every animation at once; these tests hold the slide-out open.
const reanimated = jest.requireMock<{
  withTiming: (value: number, config?: object, callback?: TimingCallback) => number;
}>('react-native-reanimated');

/** Renders a titled sheet and returns a way to show or hide it, as its screen would. */
const renderToggle = (visible: boolean) => {
  const tree = (isVisible: boolean) => (
    <StoryDecorator>
      <BottomSheet visible={isVisible} onClose={jest.fn()} title="Theme" testID="sheet">
        <Text>Body</Text>
      </BottomSheet>
    </StoryDecorator>
  );
  const { rerender } = render(tree(visible));
  return { setVisible: (isVisible: boolean) => rerender(tree(isVisible)) };
};

/** Holds every slide back: the callbacks are the only way the test finishes an animation. */
const holdAnimations = () => {
  const callbacks: TimingCallback[] = [];
  jest.spyOn(reanimated, 'withTiming').mockImplementation((value, _config, callback) => {
    if (callback) callbacks.push(callback);
    return value;
  });
  return callbacks;
};

const presentedModal = () => screen.UNSAFE_getByType(Modal).props.visible;

const renderSheet = (props: SheetProps = {}, scheme: Scheme = 'light') =>
  render(
    <StoryDecorator theme={scheme}>
      <BottomSheet visible onClose={jest.fn()} title="Theme" testID="sheet" {...props}>
        {props.children ?? <Text>Body</Text>}
      </BottomSheet>
    </StoryDecorator>
  );

const flat = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style) as Record<string, unknown>;

/**
 * The scrim is hidden from assistive technology on purpose (see below), and RNTL's queries skip
 * hidden elements by default — so a test that TAPS it has to say it is reaching past that, which
 * is exactly what a sighted user's finger does.
 */
const scrim = () => screen.getByTestId('sheet-scrim', { includeHiddenElements: true });

describe('BottomSheet', () => {
  it('announces open and close on visibility transitions', () => {
    const announceSpy = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);

    const { rerender } = render(
      <StoryDecorator>
        <BottomSheet visible={false} onClose={jest.fn()} title="Theme">
          <></>
        </BottomSheet>
      </StoryDecorator>
    );
    expect(announceSpy).not.toHaveBeenCalled();

    rerender(
      <StoryDecorator>
        <BottomSheet visible onClose={jest.fn()} title="Theme">
          <></>
        </BottomSheet>
      </StoryDecorator>
    );
    expect(announceSpy).toHaveBeenCalledWith('Theme opened');

    rerender(
      <StoryDecorator>
        <BottomSheet visible={false} onClose={jest.fn()} title="Theme">
          <></>
        </BottomSheet>
      </StoryDecorator>
    );
    expect(announceSpy).toHaveBeenCalledWith('Theme closed');

    announceSpy.mockRestore();
  });

  it('calls onClose when the scrim is pressed', () => {
    const onClose = jest.fn();
    renderSheet({ onClose });
    fireEvent.press(scrim());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // AC8 — the scrim FADES and only the sheet slides. A native Modal animation moves the WHOLE
  // modal: `slide` carried the dark scrim up the screen like a curtain, and `fade` faded the sheet
  // too, so the rows behind it showed through while it rose (seen frame by frame in the app).
  it('presents the modal with no native animation, leaving the motion to Reanimated (AC8)', () => {
    renderSheet();
    expect(screen.UNSAFE_getByType(Modal).props.animationType).toBe('none');
  });

  describe('motion (AC8)', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    // In % of the sheet's own height, so the whole 220 ms is motion the eye can see.
    it('slides the sheet up by its own height when shown, and back down when hidden', () => {
      expect(getSheetOffset(true)).toBe(0);
      expect(getSheetOffset(false)).toBe(100);
    });

    // A window height in points left a short sheet off the screen for most of the slide.
    it('moves the sheet in % of its own height, never in points', () => {
      expect(getSlideStyle(getSheetOffset(false))).toEqual({ transform: [{ translateY: '100%' }] });
      expect(getSlideStyle(getSheetOffset(true))).toEqual({ transform: [{ translateY: '0%' }] });
    });

    it('shows all of the scrim with the sheet, and none of it without', () => {
      expect(getScrimOpacity(true)).toBe(1);
      expect(getScrimOpacity(false)).toBe(0);
    });

    it('settles on the 220 ms the multi-code picker already used', () => {
      expect(SHEET_SLIDE_MS).toBe(220);
    });

    it('fades the scrim and slides the sheet on the same 220 ms ease-out, both ways', () => {
      const timing = jest.spyOn(reanimated, 'withTiming');
      // The jest.setup mock hands `Easing.out(Easing.ease)` back as the `ease` it wraps.
      const config = { duration: 220, easing: 'ease' };
      const { setVisible } = renderToggle(true);
      expect(timing).toHaveBeenCalledWith(1, config);
      expect(timing).toHaveBeenCalledWith(0, config, expect.any(Function));

      timing.mockClear();
      setVisible(false);
      expect(timing).toHaveBeenCalledWith(0, config);
      expect(timing).toHaveBeenCalledWith(100, config, expect.any(Function));
    });

    it('keeps the modal up while the sheet slides out, and takes it down when the slide ends', () => {
      const callbacks = holdAnimations();
      const { setVisible } = renderToggle(true);
      setVisible(false);
      // Still drawn, though already hidden from assistive technology (the Modal's
      // `accessibilityElementsHidden`), which is why these queries reach past that.
      expect(presentedModal()).toBe(true);
      expect(screen.getByText('Body', { includeHiddenElements: true })).toBeTruthy();

      act(() => callbacks.at(-1)?.(true));
      expect(presentedModal()).toBe(false);
      expect(screen.queryByText('Body', { includeHiddenElements: true })).toBeNull();
    });

    it('stays up when a re-open interrupts the slide-out', () => {
      const callbacks = holdAnimations();
      const { setVisible } = renderToggle(true);
      setVisible(false);
      const slideOut = callbacks.at(-1);
      setVisible(true);

      // Reanimated reports an interrupted animation as unfinished.
      act(() => slideOut?.(false));
      expect(presentedModal()).toBe(true);
    });

    // The callback hops to the JS thread (`scheduleOnRN`), so a cut-short slide-out can report in
    // after the sheet has been re-opened AND closed again.
    it('lets only the LAST slide-out take the modal down after close, re-open, close', () => {
      const callbacks = holdAnimations();
      const { setVisible } = renderToggle(true);
      setVisible(false);
      const firstSlideOut = callbacks.at(-1);
      setVisible(true);
      setVisible(false);
      const secondSlideOut = callbacks.at(-1);

      act(() => firstSlideOut?.(false));
      expect(presentedModal()).toBe(true);

      act(() => secondSlideOut?.(true));
      expect(presentedModal()).toBe(false);
    });

    it('takes no touches while it slides out, so no action fires a second time', () => {
      holdAnimations();
      const { setVisible } = renderToggle(true);
      expect(flat('sheet-root').pointerEvents).toBeUndefined();

      setVisible(false);
      expect(
        StyleSheet.flatten(
          screen.getByTestId('sheet-root', { includeHiddenElements: true }).props.style
        ).pointerEvents
      ).toBe('none');
    });

    it('opens in the same render as `visible`, with nothing to wait for', () => {
      holdAnimations();
      const { setVisible } = renderToggle(false);
      expect(presentedModal()).toBe(false);

      setVisible(true);
      expect(presentedModal()).toBe(true);
    });
  });

  // AC1 / AC11 — the grabber was the OFF-spec part: 40 × 4, radius 2, at 40 % opacity of
  // `textSecondary`. The spec (`stitch-prompts-settings.txt`) is 36 × 4, fully rounded, solid
  // #D6D6CB, 8px above.
  it.each<[Scheme, string]>([
    ['light', '#D6D6CB'],
    ['dark', '#3A3A48']
  ])(
    'draws the spec grabber in %s: 36 × 4, fully rounded, solid hairline, 8 above',
    (scheme, hex) => {
      renderSheet({}, scheme);
      const grabber = flat('sheet-grabber');
      expect(grabber).toMatchObject({
        width: 36,
        height: 4,
        borderRadius: 2,
        marginTop: 8,
        backgroundColor: hex
      });
      expect(grabber.opacity).toBeUndefined();
    }
  );

  it.each<[Scheme, string]>([
    ['light', '#FFFFFF'],
    ['dark', '#181824']
  ])('is a %s sheet rounded 16 on its TOP corners only, with 24pt margins', (scheme, fill) => {
    renderSheet({}, scheme);
    const sheet = flat('sheet-content');
    expect(sheet).toMatchObject({
      backgroundColor: fill,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingHorizontal: 24
    });
    expect(sheet.borderBottomLeftRadius).toBeUndefined();
    expect(sheet.borderBottomRightRadius).toBeUndefined();
    // 8pt above the home indicator's 34pt inset.
    expect(sheet.paddingBottom).toBe(34 + 8);
  });

  it('caps its height so a long list scrolls inside it rather than off the screen', () => {
    renderSheet();
    expect(flat('sheet-content').maxHeight).toBe('80%');
  });

  it('dims with ink at 40 %, never a flat black', () => {
    renderSheet();
    expect(StyleSheet.flatten(scrim().props.style).backgroundColor).toBe('rgba(24, 24, 36, 0.4)');
  });

  it('sets the title in the sheet-title token as a heading, and the description 8pt under it', () => {
    renderSheet({ description: 'Choose how your cards look.' });
    const title = screen.getByText('Theme');
    expect(title.props.accessibilityRole).toBe('header');
    expect(StyleSheet.flatten(title.props.style)).toMatchObject({
      fontFamily: 'Space Grotesk',
      fontSize: 20,
      fontWeight: '700'
    });
    expect(
      StyleSheet.flatten(screen.getByText('Choose how your cards look.').props.style)
    ).toMatchObject({ marginTop: 8 });
  });

  describe('assistive technology', () => {
    // The content used to be a `Pressable`, which is an accessibility element by default — so on
    // iOS VoiceOver saw ONE element and could not reach the buttons inside any sheet.
    it('keeps the sheet a modal CONTAINER, so the controls inside it stay reachable', () => {
      renderSheet({
        children: (
          <Button variant="secondary" onPress={jest.fn()}>
            Cancel
          </Button>
        )
      });
      const content = screen.getByTestId('sheet-content');
      expect(content.props.accessible).not.toBe(true);
      expect(content.props.accessibilityViewIsModal).toBe(true);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    });

    it('hides the scrim, which is a touch affordance with no name', () => {
      renderSheet();
      expect(screen.queryByTestId('sheet-scrim')).toBeNull();
      const { props } = scrim();
      expect(props.accessible).toBe(false);
      expect(props.importantForAccessibility).toBe('no');
      expect(props.accessibilityElementsHidden).toBe(true);
    });

    // With the scrim hidden, VoiceOver's own dismiss gesture is the equivalent of tapping it.
    it('closes on the VoiceOver escape gesture', () => {
      const onClose = jest.fn();
      renderSheet({ onClose });
      screen.getByTestId('sheet-content').props.onAccessibilityEscape();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
