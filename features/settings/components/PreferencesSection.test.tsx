import { fireEvent, render } from '@testing-library/react-native';

import { PreferencesSection } from './PreferencesSection';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    // Extended for Story 16.39: the real `ToggleSwitch` is rendered below rather than
    // stubbed, and it reads these.
    theme: {
      textTertiary: '#999',
      textPrimary: '#111',
      primary: '#1A73E8',
      borderStrong: '#888',
      surfaceElevated: '#EEE'
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
    ),
    // NOT stubbed, deliberately. The assertions below are about `accessibilityRole`
    // and `accessibilityState`, which live in the real component — a stub would let
    // them pass while the shipped switch announced nothing.
    ToggleSwitch: jest.requireActual('@/shared/components/ui/ToggleSwitch').ToggleSwitch
  };
});

describe('PreferencesSection', () => {
  it('renders the auto-brightness toggle and reports changes (Story 16.39)', () => {
    const onAutoBrightnessChange = jest.fn();

    const { getByTestId } = render(
      <PreferencesSection
        themeLabel="System"
        languageName="English"
        onThemePress={jest.fn()}
        onLanguagePress={jest.fn()}
        isAutoBrightnessEnabled={false}
        onAutoBrightnessChange={onAutoBrightnessChange}
      />
    );

    fireEvent.press(getByTestId('settings-auto-brightness-toggle'));

    // Reports the NEXT value, not the current one — the row is a switch, so pressing
    // it means "make it the other thing".
    expect(onAutoBrightnessChange).toHaveBeenCalledWith(true);
  });

  it('uses the same bulb glyph as the card screen control (Story 16.39)', () => {
    // These two surfaces are the same feature — a standing preference and its
    // per-visit override — so they must not use different metaphors. This row used a
    // sun (`light-mode`) until QA caught the mismatch; a sun also collided with the
    // Theme row above, which already uses `brightness-6`.
    const { getByTestId } = render(
      <PreferencesSection
        themeLabel="System"
        languageName="English"
        onThemePress={jest.fn()}
        onLanguagePress={jest.fn()}
        isAutoBrightnessEnabled={false}
        onAutoBrightnessChange={jest.fn()}
      />
    );

    // `includeHiddenElements` is required, and its necessity is itself the proof that
    // the accessibility fix below works: the icon is hidden from the a11y tree, and
    // RNTL excludes a11y-hidden elements from queries by default.
    expect(getByTestId('icon-lightbulb', { includeHiddenElements: true })).toBeTruthy();
  });

  it('exposes the auto-brightness row as ONE screen-reader stop (Story 16.39)', () => {
    // The Theme and Language rows above get this for free: `ActionRow` wraps its icon
    // inside the Pressable that carries the label. This row's icon is a SIBLING of the
    // switch, and `MaterialIcons` renders a Text node with real glyph content — left
    // exposed it would read as an extra, unlabelled swipe-stop before "Full brightness,
    // switch", making this row behave differently from its neighbours.
    const { UNSAFE_getByType } = render(
      <PreferencesSection
        themeLabel="System"
        languageName="English"
        onThemePress={jest.fn()}
        onLanguagePress={jest.fn()}
        isAutoBrightnessEnabled={false}
        onAutoBrightnessChange={jest.fn()}
      />
    );
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View } = require('react-native');
    const hidden = UNSAFE_getByType(View).findAll(
      (node: { props?: Record<string, unknown> }) =>
        node.props?.accessibilityElementsHidden === true &&
        node.props?.importantForAccessibility === 'no-hide-descendants'
    );

    // Both props, because they are platform-specific: `accessibilityElementsHidden` is
    // iOS, `importantForAccessibility` is Android. One alone leaves the other platform
    // with the stray stop.
    expect(hidden.length).toBeGreaterThanOrEqual(1);
  });

  it('reflects the enabled state to assistive technology (Story 16.39)', () => {
    const { getByTestId } = render(
      <PreferencesSection
        themeLabel="System"
        languageName="English"
        onThemePress={jest.fn()}
        onLanguagePress={jest.fn()}
        isAutoBrightnessEnabled
        onAutoBrightnessChange={jest.fn()}
      />
    );
    const toggle = getByTestId('settings-auto-brightness-toggle');

    expect(toggle.props.accessibilityRole).toBe('switch');
    expect(toggle.props.accessibilityState).toEqual(expect.objectContaining({ checked: true }));
  });

  it('shows values and fires handlers', () => {
    const onThemePress = jest.fn();
    const onLanguagePress = jest.fn();

    const { getByText, getByTestId } = render(
      <PreferencesSection
        themeLabel="System"
        languageName="English"
        onThemePress={onThemePress}
        onLanguagePress={onLanguagePress}
        isAutoBrightnessEnabled={false}
        onAutoBrightnessChange={jest.fn()}
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
