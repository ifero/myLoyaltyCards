import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { LanguagePickerSheet } from './LanguagePickerSheet';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      border: '#ddd',
      primary: '#1A73E8',
      textPrimary: '#111'
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

describe('LanguagePickerSheet', () => {
  it('renders options and selects language', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <LanguagePickerSheet
        visible
        currentCode="en"
        options={[{ code: 'en', name: 'English' }]}
        onSelect={onSelect}
        onClose={jest.fn()}
      />
    );

    fireEvent.press(getByTestId('language-option-en'));
    expect(onSelect).toHaveBeenCalledWith('en');
  });
});
