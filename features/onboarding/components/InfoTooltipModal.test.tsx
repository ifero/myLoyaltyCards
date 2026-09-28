import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo, findNodeHandle, Pressable, View } from 'react-native';

import { InfoTooltipModal } from './InfoTooltipModal';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      surface: '#FFFFFF',
      textPrimary: '#1F1F24',
      textSecondary: '#66666B',
      primary: '#1A73E8',
      border: '#E5E5EB'
    }
  })
}));

// The component reads `findNodeHandle` off the raw `react-native` exports on every call. A
// namespace import is a babel-interop copy of that object, so a spy installed on it is never hit.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const reactNativeExports: { findNodeHandle: typeof findNodeHandle } = require('react-native');

const FOCUS_DELAY_MS = 50;
const CLOSE_BUTTON_TAG = 11;
const TRIGGER_TAG = 22;

const advanceTimersBy = (ms: number) => {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
};

describe('InfoTooltipModal', () => {
  // Both focus moves are deferred with a 50 ms `setTimeout`. Under real timers those callbacks
  // outlived the test that scheduled them and ran — or didn't — depending on how fast the rest of
  // the run was, so this file's coverage differed between identical runs. Fake timers keep every
  // callback inside its test; `useRealTimers` discards the ones a test never advances.
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders when visible', () => {
    const { getByTestId } = render(<InfoTooltipModal visible onClose={jest.fn()} testID="modal" />);
    expect(getByTestId('modal')).toBeTruthy();
  });

  it('does not render content when not visible', () => {
    const { queryByTestId } = render(
      <InfoTooltipModal visible={false} onClose={jest.fn()} testID="modal" />
    );
    expect(queryByTestId('modal-content')).toBeNull();
  });

  it('dismiss button closes modal', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(<InfoTooltipModal visible onClose={onClose} testID="modal" />);

    fireEvent.press(getByTestId('info-tooltip-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('tap outside closes modal', () => {
    const onClose = jest.fn();
    const { UNSAFE_getByProps } = render(
      <InfoTooltipModal visible onClose={onClose} testID="modal" />
    );

    fireEvent.press(UNSAFE_getByProps({ testID: 'modal-scrim' }));
    expect(onClose).toHaveBeenCalled();
  });

  describe('accessibility focus', () => {
    let findNodeHandleSpy: jest.SpiedFunction<typeof findNodeHandle>;

    // RN's jest environment keeps no native view registry: the real `findNodeHandle` resolves the
    // mocked `View` behind a `Pressable` ref to `null`, so the component would skip every focus
    // call. Hand out a tag, by testID, to the two views the modal moves focus to.
    beforeEach(() => {
      const tagsByTestID: Record<string, number> = {
        'info-tooltip-close': CLOSE_BUTTON_TAG,
        'tooltip-trigger': TRIGGER_TAG
      };
      findNodeHandleSpy = jest
        .spyOn(reactNativeExports, 'findNodeHandle')
        .mockImplementation((componentOrHandle) =>
          componentOrHandle instanceof React.Component
            ? (tagsByTestID[componentOrHandle.props.testID] ?? null)
            : null
        );
    });

    afterEach(() => {
      findNodeHandleSpy.mockRestore();
    });

    // The trigger sits outside the modal, as on ModeSelectionScreen. Hiding it keeps its slot, so
    // the modal stays mounted and doesn't schedule a second opening focus move.
    const TooltipWithTrigger = ({
      triggerRef,
      showTrigger = true
    }: {
      triggerRef: React.RefObject<View | null>;
      showTrigger?: boolean;
    }) => (
      <>
        {showTrigger && <Pressable ref={triggerRef} testID="tooltip-trigger" />}
        <InfoTooltipModal visible onClose={jest.fn()} triggerRef={triggerRef} testID="modal" />
      </>
    );

    it('moves focus to the close button once the open delay elapses', () => {
      render(<InfoTooltipModal visible onClose={jest.fn()} testID="modal" />);

      advanceTimersBy(FOCUS_DELAY_MS - 1);
      expect(AccessibilityInfo.setAccessibilityFocus).not.toHaveBeenCalled();

      advanceTimersBy(1);
      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledTimes(1);
      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(CLOSE_BUTTON_TAG);
    });

    it('does not move focus when the modal unmounts before the open delay elapses', () => {
      const { unmount } = render(<InfoTooltipModal visible onClose={jest.fn()} testID="modal" />);
      unmount();

      advanceTimersBy(FOCUS_DELAY_MS);
      expect(AccessibilityInfo.setAccessibilityFocus).not.toHaveBeenCalled();
    });

    it('returns focus to the trigger once the close delay elapses', () => {
      const triggerRef = React.createRef<View>();
      const { getByTestId } = render(<TooltipWithTrigger triggerRef={triggerRef} />);
      // Let the opening focus move land first, so the one after closing is unambiguous.
      advanceTimersBy(FOCUS_DELAY_MS);
      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenLastCalledWith(CLOSE_BUTTON_TAG);

      fireEvent.press(getByTestId('info-tooltip-close'));

      advanceTimersBy(FOCUS_DELAY_MS - 1);
      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledTimes(1);

      advanceTimersBy(1);
      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledTimes(2);
      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenLastCalledWith(TRIGGER_TAG);
    });

    it('does not move focus when the trigger unmounts before the close delay elapses', () => {
      const triggerRef = React.createRef<View>();
      const { getByTestId, rerender } = render(<TooltipWithTrigger triggerRef={triggerRef} />);
      advanceTimersBy(FOCUS_DELAY_MS);

      fireEvent.press(getByTestId('info-tooltip-close'));
      rerender(<TooltipWithTrigger triggerRef={triggerRef} showTrigger={false} />);

      advanceTimersBy(FOCUS_DELAY_MS);
      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledTimes(1);
      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenLastCalledWith(CLOSE_BUTTON_TAG);
    });

    it('does not move focus on close without a trigger ref', () => {
      const { getByTestId } = render(
        <InfoTooltipModal visible onClose={jest.fn()} testID="modal" />
      );
      advanceTimersBy(FOCUS_DELAY_MS);

      fireEvent.press(getByTestId('info-tooltip-close'));

      advanceTimersBy(FOCUS_DELAY_MS);
      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledTimes(1);
      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenLastCalledWith(CLOSE_BUTTON_TAG);
    });
  });
});
