import { fireEvent, render } from '@testing-library/react-native';

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
  const { Pressable, Text } = jest.requireActual('react-native');

  return {
    ActionRow: ({
      testID,
      label,
      onPress,
      isLoading,
      showChevron,
      disabled,
      accessibilityLabel
    }: {
      testID?: string;
      label: string;
      onPress: () => void;
      isLoading?: boolean;
      showChevron?: boolean;
      disabled?: boolean;
      accessibilityLabel?: string;
    }) => (
      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
      >
        <Text>{label}</Text>
        {isLoading ? <Text testID={`${testID}-loading`}>loading</Text> : null}
        {showChevron ? <Text testID={`${testID}-chevron`}>chevron</Text> : null}
        {disabled ? <Text testID={`${testID}-disabled`}>disabled</Text> : null}
      </Pressable>
    )
  };
});

describe('AccountSection', () => {
  it('renders email and fires sign-out/change-password/delete handlers', () => {
    const onSignOut = jest.fn();
    const onChangePassword = jest.fn();
    const onDeleteAccount = jest.fn();

    const { getByText, getByTestId } = render(
      <AccountSection
        email="user@mail.com"
        onSignOut={onSignOut}
        onChangePassword={onChangePassword}
        onDeleteAccount={onDeleteAccount}
      />
    );

    expect(getByText('user@mail.com')).toBeTruthy();

    // Each account action fires its own handler.
    fireEvent.press(getByTestId('settings-signout-row'));
    fireEvent.press(getByTestId('settings-change-password-row'));
    fireEvent.press(getByTestId('settings-delete-row'));

    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(onChangePassword).toHaveBeenCalledTimes(1);
    expect(onDeleteAccount).toHaveBeenCalledTimes(1);
  });

  it('places Change Password between Sign Out and Delete Account (AC1)', () => {
    // Assert render order, not just presence: a regression that moved the row
    // (e.g. above Sign Out) must fail here.
    const tree = JSON.stringify(
      render(
        <AccountSection
          email="user@mail.com"
          onSignOut={jest.fn()}
          onChangePassword={jest.fn()}
          onDeleteAccount={jest.fn()}
        />
      ).toJSON()
    );

    const signOutIndex = tree.indexOf('settings-signout-row');
    const changePasswordIndex = tree.indexOf('settings-change-password-row');
    const deleteIndex = tree.indexOf('settings-delete-row');

    expect(signOutIndex).toBeGreaterThan(-1);
    expect(signOutIndex).toBeLessThan(changePasswordIndex);
    expect(changePasswordIndex).toBeLessThan(deleteIndex);
  });

  it('exposes a localized accessibility label and a chevron on the idle Change Password row (AC1)', () => {
    const { getByTestId, queryByTestId } = render(
      <AccountSection
        email="user@mail.com"
        onSignOut={jest.fn()}
        onChangePassword={jest.fn()}
        onDeleteAccount={jest.fn()}
      />
    );

    const row = getByTestId('settings-change-password-row');
    expect(row.props.accessibilityLabel).toBe('Change Password');
    expect(queryByTestId('settings-change-password-row-disabled')).toBeNull();
    expect(getByTestId('settings-change-password-row-chevron')).toBeTruthy();
  });

  it('shows a spinner, hides the chevron, and disables the row while a change is starting', () => {
    const { getByTestId, queryByTestId } = render(
      <AccountSection
        email="user@mail.com"
        onSignOut={jest.fn()}
        onChangePassword={jest.fn()}
        onDeleteAccount={jest.fn()}
        isChangingPassword
      />
    );

    expect(getByTestId('settings-change-password-row-disabled')).toBeTruthy();
    expect(getByTestId('settings-change-password-row-loading')).toBeTruthy();
    expect(queryByTestId('settings-change-password-row-chevron')).toBeNull();
  });
});
