import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { AccountSection } from './AccountSection';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      surfaceElevated: '#F5F5F5',
      primary: '#1A73E8',
      textPrimary: '#111',
      textSecondary: '#777',
      success: '#16A34A',
      error: '#DC2626'
    }
  })
}));

jest.mock('@/shared/components/ui', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');

  return {
    ActionRow: ({
      testID,
      label,
      onPress
    }: {
      testID?: string;
      label: string;
      onPress: () => void;
    }) => (
      <Pressable testID={testID} onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    )
  };
});

describe('AccountSection', () => {
  it('renders email and fires sign-out/delete handlers', () => {
    const onSignOut = jest.fn();
    const onDeleteAccount = jest.fn();

    const { getByText, getByTestId } = render(
      <AccountSection
        email="user@mail.com"
        onSignOut={onSignOut}
        onDeleteAccount={onDeleteAccount}
      />
    );

    expect(getByText('user@mail.com')).toBeTruthy();

    fireEvent.press(getByTestId('settings-signout-row'));
    fireEvent.press(getByTestId('settings-delete-row'));

    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(onDeleteAccount).toHaveBeenCalledTimes(1);
  });
});
