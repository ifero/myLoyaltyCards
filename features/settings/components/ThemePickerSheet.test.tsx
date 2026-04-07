import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { ThemePickerSheet } from './ThemePickerSheet';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      border: '#ddd',
      primary: '#1A73E8',
      textPrimary: '#111',
      textSecondary: '#777'
    }
  })
}));

jest.mock('@/shared/components/ui', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    BottomSheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
      visible ? <View>{children}</View> : null
  };
});

describe('ThemePickerSheet', () => {
  it('renders options and selects theme', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <ThemePickerSheet visible selectedTheme="system" onSelect={onSelect} onClose={jest.fn()} />
    );

    fireEvent.press(getByTestId('theme-option-dark'));
    expect(onSelect).toHaveBeenCalledWith('dark');
  });
});
