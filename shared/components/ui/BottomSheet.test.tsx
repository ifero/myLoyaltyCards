import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo } from 'react-native';

import { BottomSheet } from './BottomSheet';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 })
}));

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      surface: '#FFFFFF',
      textPrimary: '#111111',
      textSecondary: '#777777'
    }
  })
}));

describe('BottomSheet', () => {
  it('announces open and close on visibility transitions', () => {
    const announceSpy = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);

    const { rerender } = render(
      <BottomSheet visible={false} onClose={jest.fn()} title="Theme">
        <></>
      </BottomSheet>
    );

    expect(announceSpy).not.toHaveBeenCalled();

    rerender(
      <BottomSheet visible onClose={jest.fn()} title="Theme">
        <></>
      </BottomSheet>
    );

    expect(announceSpy).toHaveBeenCalledWith('Theme opened');

    rerender(
      <BottomSheet visible={false} onClose={jest.fn()} title="Theme">
        <></>
      </BottomSheet>
    );

    expect(announceSpy).toHaveBeenCalledWith('Theme closed');

    announceSpy.mockRestore();
  });

  it('calls onClose when scrim is pressed', () => {
    const onClose = jest.fn();

    const { getByTestId } = render(
      <BottomSheet visible onClose={onClose} testID="sample-sheet" title="Sample">
        <></>
      </BottomSheet>
    );

    fireEvent.press(getByTestId('sample-sheet-scrim'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
