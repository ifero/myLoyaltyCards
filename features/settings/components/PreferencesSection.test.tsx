import { fireEvent, render } from '@testing-library/react-native';

import { PreferencesSection } from './PreferencesSection';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: { textTertiary: '#999' }
  })
}));

jest.mock('@/shared/components/ui', () => {
  const { Pressable, Text } = jest.requireActual('react-native');

  return {
    ActionRow: ({
      testID,
      label,
      onPress,
      value
    }: {
      testID?: string;
      label: string;
      onPress: () => void;
      value?: string;
    }) => (
      <Pressable testID={testID} onPress={onPress}>
        <Text>{label}</Text>
        <Text>{value}</Text>
      </Pressable>
    )
  };
});

describe('PreferencesSection', () => {
  it('shows values and fires handlers', () => {
    const onThemePress = jest.fn();
    const onLanguagePress = jest.fn();

    const { getByText, getByTestId } = render(
      <PreferencesSection
        themeLabel="System"
        languageName="English"
        onThemePress={onThemePress}
        onLanguagePress={onLanguagePress}
      />
    );

    expect(getByText('System')).toBeTruthy();
    expect(getByText('English')).toBeTruthy();

    fireEvent.press(getByTestId('settings-theme-row'));
    fireEvent.press(getByTestId('settings-language-row'));

    expect(onThemePress).toHaveBeenCalledTimes(1);
    expect(onLanguagePress).toHaveBeenCalledTimes(1);
  });
});
