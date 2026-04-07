import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { AccountSectionGuest } from './AccountSectionGuest';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      surfaceElevated: '#F5F5F5',
      primary: '#1A73E8',
      textPrimary: '#111',
      textSecondary: '#777'
    }
  })
}));

jest.mock('@/shared/components/ui', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');

  return {
    Button: ({
      testID,
      children,
      onPress
    }: {
      testID?: string;
      children: React.ReactNode;
      onPress: () => void;
    }) => (
      <Pressable testID={testID} onPress={onPress}>
        <Text>{children}</Text>
      </Pressable>
    )
  };
});

describe('AccountSectionGuest', () => {
  it('fires create-account and sign-in handlers', () => {
    const onCreateAccount = jest.fn();
    const onSignIn = jest.fn();

    const { getByTestId } = render(
      <AccountSectionGuest onCreateAccount={onCreateAccount} onSignIn={onSignIn} />
    );

    fireEvent.press(getByTestId('settings-create-account-button'));
    fireEvent.press(getByTestId('settings-sign-in-button'));

    expect(onCreateAccount).toHaveBeenCalledTimes(1);
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });
});
