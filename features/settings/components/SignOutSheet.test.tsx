import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { SignOutSheet } from './SignOutSheet';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: { primary: '#1A73E8', textPrimary: '#111', textSecondary: '#777', error: '#DC2626' }
  })
}));

jest.mock('@/shared/components/ui', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');

  return {
    BottomSheet: ({ visible, children }: { visible: boolean; children: ReactNode }) =>
      visible ? <View>{children}</View> : null,
    Button: ({
      testID,
      onPress,
      children
    }: {
      testID?: string;
      onPress: () => void;
      children: ReactNode;
    }) => (
      <Pressable testID={testID} onPress={onPress}>
        <Text>{children}</Text>
      </Pressable>
    )
  };
});

describe('SignOutSheet', () => {
  it('renders and handles confirm/cancel', () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();

    const { getByTestId } = render(
      <SignOutSheet
        visible
        isLoading={false}
        error={null}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    );

    fireEvent.press(getByTestId('signout-confirm'));
    fireEvent.press(getByTestId('signout-cancel'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
