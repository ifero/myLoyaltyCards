import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { AboutSection } from './AboutSection';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: { textTertiary: '#999' }
  })
}));

jest.mock('@/shared/components/ui', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');

  return {
    ActionRow: ({
      testID,
      label,
      value,
      onPress,
      disabled = false
    }: {
      testID?: string;
      label: string;
      value?: string;
      onPress: () => void;
      disabled?: boolean;
    }) => (
      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={disabled}
        accessibilityState={{ disabled }}
      >
        <Text>{label}</Text>
        <Text>{value}</Text>
      </Pressable>
    )
  };
});

describe('AboutSection', () => {
  it('renders versions and navigation actions', () => {
    const onHelpPress = jest.fn();
    const onPrivacyPress = jest.fn();
    const { getByText, getByTestId } = render(
      <AboutSection
        appVersion="1.2.3"
        catalogueVersion="v3 · Mar 2026"
        onHelpPress={onHelpPress}
        onPrivacyPress={onPrivacyPress}
      />
    );

    expect(getByText('1.2.3')).toBeTruthy();
    expect(getByText('v3 · Mar 2026')).toBeTruthy();
    expect(getByTestId('settings-app-version-row')).toHaveProp('accessibilityState', {
      disabled: true
    });
    expect(getByTestId('settings-catalogue-row')).toHaveProp('accessibilityState', {
      disabled: true
    });

    fireEvent.press(getByTestId('settings-help-row'));
    fireEvent.press(getByTestId('settings-privacy-row'));

    expect(onHelpPress).toHaveBeenCalledTimes(1);
    expect(onPrivacyPress).toHaveBeenCalledTimes(1);
  });
});
