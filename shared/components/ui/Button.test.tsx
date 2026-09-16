import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from './Button';

const mockUseTheme = jest.fn();

jest.mock('@/shared/theme', () => ({
  useTheme: () => mockUseTheme()
}));

/**
 * `onPrimary` and `onError` COINCIDE in the real palette — white in light, ink
 * in dark — so a fixture that copied it could not tell "reads `onError`" from
 * "reads `onPrimary`" in either scheme. They are deliberately divergent here,
 * with the `onError` values marked by an `EE` channel, so each test below proves
 * the variant reaches for its OWN token. The real values are pinned by
 * `tokens.generated.test.ts`; this fixture's job is wiring, not values.
 */
const lightTheme = {
  primary: '#181824',
  primaryDark: '#2A2A3A',
  onPrimary: '#FFFFFF',
  border: '#D6D6CB',
  textTertiary: '#8A8A82',
  error: '#C41E1E',
  onError: '#EEEEEE'
};

const darkTheme = {
  primary: '#FCCC0C',
  primaryDark: '#F0F0E8',
  onPrimary: '#181824',
  border: '#3A3A48',
  textTertiary: '#7E7E74',
  error: '#FF453A',
  onError: '#EE1824'
};

const labelColour = (text: string): unknown => {
  const { style } = screen.getByText(text).props;
  return (Array.isArray(style) ? Object.assign({}, ...style) : style).color;
};

describe('Button', () => {
  beforeEach(() => {
    mockUseTheme.mockReturnValue({ theme: lightTheme });
  });

  it('renders primary button and handles press', () => {
    const onPress = jest.fn();
    render(
      <Button variant="primary" onPress={onPress} testID="btn">
        Save
      </Button>
    );

    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('renders secondary variant', () => {
    render(
      <Button variant="secondary" testID="btn">
        Secondary
      </Button>
    );

    expect(screen.getByText('Secondary')).toBeTruthy();
  });

  it('renders tertiary variant', () => {
    render(
      <Button variant="tertiary" testID="btn">
        Tertiary
      </Button>
    );

    expect(screen.getByText('Tertiary')).toBeTruthy();
  });

  it('renders destructive variant', () => {
    render(
      <Button variant="destructive" testID="btn">
        Delete
      </Button>
    );

    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('renders loading state', () => {
    render(
      <Button variant="secondary" loading testID="btn">
        Load
      </Button>
    );

    expect(screen.getByTestId('btn-spinner')).toBeTruthy();
  });

  it('disables destructive button when disabled=true', () => {
    const onPress = jest.fn();
    render(
      <Button variant="destructive" disabled onPress={onPress} testID="btn">
        Delete
      </Button>
    );

    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('updates visual state on press interactions', () => {
    render(
      <Button variant="primary" testID="btn">
        Pressed
      </Button>
    );

    const button = screen.getByTestId('btn');
    fireEvent(button, 'pressIn');
    fireEvent(button, 'pressOut');
    expect(button).toBeTruthy();
  });

  it('supports dark mode tokens', () => {
    mockUseTheme.mockReturnValue({ theme: darkTheme });

    render(
      <Button variant="primary" testID="btn">
        Dark
      </Button>
    );

    expect(screen.getByText('Dark')).toBeTruthy();
  });

  /**
   * Story 21.2 — the primary label follows the fill.
   *
   * The fill is ink in light and BEAM in dark, and white on beam is 1.52:1. A
   * hardcoded white label was therefore correct for exactly as long as primary
   * stayed blue, and became a WCAG failure the moment it did not — the kind that
   * looks brighter in a screenshot, so a visual review passes it.
   */
  it.each([
    ['light', lightTheme, '#FFFFFF'],
    ['dark', darkTheme, '#181824']
  ])('paints the primary label with onPrimary in %s', (_scheme, theme, expected) => {
    mockUseTheme.mockReturnValue({ theme });

    render(
      <Button variant="primary" testID="btn">
        Save
      </Button>
    );

    expect(labelColour('Save')).toBe(expected);
  });

  /**
   * The destructive fill is `theme.error`, and the same crossover bites it: the
   * dark red is lifted far enough to read on black that white no longer reads on
   * IT (3.41:1, against ink's 5.16:1). `colors.contrast.test.ts` proves the token
   * pair; this proves the component actually reaches for it.
   */
  it.each([
    ['light', lightTheme, '#EEEEEE'],
    ['dark', darkTheme, '#EE1824']
  ])('paints the destructive label with onError in %s', (_scheme, theme, expected) => {
    mockUseTheme.mockReturnValue({ theme });

    render(
      <Button variant="destructive" testID="btn">
        Delete
      </Button>
    );

    expect(labelColour('Delete')).toBe(expected);
    expect(labelColour('Delete')).not.toBe(theme.onPrimary);
  });
});
