import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { DeleteAccountSheet } from './DeleteAccountSheet';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      error: '#DC2626',
      textPrimary: '#111',
      textSecondary: '#777',
      border: '#ddd',
      surfaceElevated: '#F5F5F5'
    }
  })
}));

jest.mock('@/shared/components/ui', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');

  return {
    BottomSheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
      visible ? <View>{children}</View> : null,
    Button: ({
      testID,
      onPress,
      children,
      disabled
    }: {
      testID?: string;
      onPress: () => void;
      children: React.ReactNode;
      disabled?: boolean;
    }) => (
      <Pressable testID={testID} onPress={onPress} disabled={disabled}>
        <Text>{children}</Text>
      </Pressable>
    )
  };
});

describe('DeleteAccountSheet', () => {
  it('moves from step1 to step2 and confirms only after DELETE', () => {
    const onConfirmDelete = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = render(
      <DeleteAccountSheet
        visible
        isLoading={false}
        error={null}
        onConfirmDelete={onConfirmDelete}
        onClose={jest.fn()}
      />
    );

    fireEvent.press(getByTestId('delete-continue-step1'));
    fireEvent.changeText(getByTestId('delete-confirm-input'), 'DELETE');
    fireEvent.press(getByTestId('delete-confirm-step2'));

    expect(onConfirmDelete).toHaveBeenCalledTimes(1);
  });
});
