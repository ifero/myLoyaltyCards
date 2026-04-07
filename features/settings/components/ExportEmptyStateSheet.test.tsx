import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { ExportEmptyStateSheet } from './ExportEmptyStateSheet';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: { primary: '#1A73E8', textPrimary: '#111', textSecondary: '#777' }
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
      children
    }: {
      testID?: string;
      onPress: () => void;
      children: React.ReactNode;
    }) => (
      <Pressable testID={testID} onPress={onPress}>
        <Text>{children}</Text>
      </Pressable>
    )
  };
});

describe('ExportEmptyStateSheet', () => {
  it('renders and dismisses', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(<ExportEmptyStateSheet visible onClose={onClose} />);
    fireEvent.press(getByTestId('export-empty-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
