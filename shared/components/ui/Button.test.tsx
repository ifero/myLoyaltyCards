import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { TOUCH_TARGET } from '@/shared/theme/spacing';

import { Button, getVariantColors } from './Button';

const mockUseTheme = jest.fn();

jest.mock('@/shared/theme', () => ({
  useTheme: () => mockUseTheme()
}));

// AC4b — an ODD value on purpose. With the real 48, a Button that hardcoded 48 would pass the
// height test below; 47 exists nowhere else, so only a Button that reads the token can match it.
jest.mock('@/shared/theme/spacing', () => ({
  TOUCH_TARGET: { min: 47 }
}));

/**
 * `onPrimary` and `onError` COINCIDE in the real palette — white in light, ink in dark — so a
 * fixture that copied it could not tell "reads `onError`" from "reads `onPrimary`" in either
 * scheme. They are deliberately divergent here, with the `onError` values marked by an `EE`
 * channel, so a variant reaching for the wrong token shows. The real values are pinned by
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

type Props = Partial<React.ComponentProps<typeof Button>>;

const renderButton = (props: Props = {}) =>
  render(
    <Button variant="primary" testID="btn" {...props}>
      {props.children ?? 'Save'}
    </Button>
  );

const flat = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style) as Record<string, unknown>;

const labelColour = (text: string): unknown =>
  (StyleSheet.flatten(screen.getByText(text).props.style) as { color?: unknown }).color;

describe('Button', () => {
  beforeEach(() => {
    mockUseTheme.mockReturnValue({ theme: lightTheme });
  });

  it('handles a press', () => {
    const onPress = jest.fn();
    renderButton({ onPress });
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Save')).toBeTruthy();
  });

  /**
   * Story 16.32 (absorbed by 22.1), AC5 — one row per variant: fill, border width, label and
   * pressed colour. `destructive` used to fall through a bare `return` into a solid red slab with
   * white text, a 1pt border and NO press feedback (its pressed colour equalled its fill).
   */
  describe.each([
    ['light', lightTheme],
    ['dark', darkTheme]
  ] as const)('variants in %s', (_scheme, theme) => {
    beforeEach(() => mockUseTheme.mockReturnValue({ theme }));

    it.each([
      ['primary', theme.primary, 1, theme.onPrimary, theme.primaryDark],
      ['secondary', 'transparent', 1, theme.primary, `${theme.primary}14`],
      ['tertiary', 'transparent', 0, theme.primary, `${theme.primary}14`],
      ['destructive', 'transparent', 0, theme.error, `${theme.error}14`]
    ] as const)(
      '%s: fill %s, border %s, label %s, pressed %s',
      (variant, fill, border, label, pressed) => {
        renderButton({ variant });

        expect(flat('btn-container')).toMatchObject({ backgroundColor: fill, borderWidth: border });
        expect(labelColour('Save')).toBe(label);

        fireEvent(screen.getByTestId('btn'), 'pressIn');
        expect(flat('btn-container').backgroundColor).toBe(pressed);
        expect(pressed).not.toBe(fill);

        fireEvent(screen.getByTestId('btn'), 'pressOut');
        expect(flat('btn-container').backgroundColor).toBe(fill);
      }
    );
  });

  // 16.32 — "no red fill, no border, no outline": the destructive label never reaches for the
  // FILL's foreground (`onError`), because there is no fill.
  it('paints the destructive label with the error colour, not with onError', () => {
    renderButton({ variant: 'destructive', children: 'Delete' });
    expect(labelColour('Delete')).toBe(lightTheme.error);
    expect(labelColour('Delete')).not.toBe(lightTheme.onError);
  });

  // 16.32 AC2 — the variant switch is exhaustive, so a new variant is a compile error until it is
  // handled rather than silently rendering as something else. `yarn typecheck` fails if this
  // directive ever stops being needed.
  it('rejects a variant it does not handle, at compile time', () => {
    // @ts-expect-error — 'ghost' is not a ButtonVariant, so it has no branch
    expect(() => getVariantColors('ghost', lightTheme as never)).toThrow(
      'Unhandled Button variant'
    );
  });

  /**
   * AC2 — "Busy is not disabled." A submitting button keeps its fill, swaps its label for a
   * spinner and ignores presses, but it is announced as BUSY, not as a disabled control: the
   * greyed `isDisabled = disabled || loading` read "no" where the system wants "working".
   */
  describe('busy (AC2)', () => {
    it('keeps its fill and swaps the label for a spinner', () => {
      renderButton({ loading: true });
      expect(flat('btn-container').backgroundColor).toBe(lightTheme.primary);
      expect(screen.getByTestId('btn-spinner')).toBeTruthy();
      expect(screen.queryByText('Save')).toBeNull();
    });

    it('is announced as busy, not disabled', () => {
      renderButton({ loading: true });
      expect(screen.getByTestId('btn').props.accessibilityState).toEqual({
        busy: true,
        disabled: false
      });
    });

    it('ignores presses, and shows no press feedback, while busy', () => {
      const onPress = jest.fn();
      renderButton({ loading: true, onPress });
      fireEvent(screen.getByTestId('btn'), 'pressIn');
      expect(flat('btn-container').backgroundColor).toBe(lightTheme.primary);
      fireEvent.press(screen.getByTestId('btn'));
      expect(onPress).not.toHaveBeenCalled();
    });

    // `CardSetupScreen` passes `disabled={isLoading}` WITH `loading`: busy must still win.
    it('stays busy rather than disabled when both are set', () => {
      renderButton({ loading: true, disabled: true });
      expect(flat('btn-container').backgroundColor).toBe(lightTheme.primary);
      expect(screen.getByTestId('btn').props.accessibilityState).toEqual({
        busy: true,
        disabled: false
      });
    });

    it('spins in the colour of the label it replaces', () => {
      renderButton({ variant: 'destructive', loading: true });
      expect(screen.getByTestId('btn-spinner').props.color).toBe(lightTheme.error);
    });
  });

  describe('disabled', () => {
    it('does not fire and is announced as disabled', () => {
      const onPress = jest.fn();
      renderButton({ disabled: true, onPress });
      fireEvent.press(screen.getByTestId('btn'));
      expect(onPress).not.toHaveBeenCalled();
      expect(screen.getByTestId('btn').props.accessibilityState).toEqual({
        busy: false,
        disabled: true
      });
    });

    it('greys a non-destructive button out', () => {
      renderButton({ disabled: true });
      expect(flat('btn-container').backgroundColor).toBe(lightTheme.border);
      expect(labelColour('Save')).toBe(lightTheme.textTertiary);
    });

    // AC11's one sanctioned disabled control: the type-to-confirm delete gate, drawn as the
    // borderless red label at 40 %.
    it('draws a disabled destructive button as its red label at 40 %', () => {
      renderButton({ variant: 'destructive', disabled: true, children: 'Delete' });
      expect(flat('btn-container')).toMatchObject({
        backgroundColor: 'transparent',
        borderWidth: 0,
        opacity: 0.4
      });
      expect(labelColour('Delete')).toBe(lightTheme.error);
    });
  });

  // AC10 — "Radius is 12 for buttons and inputs, unconditionally." It was 14.
  describe('geometry (AC10)', () => {
    it('rounds every button to the 12pt control radius', () => {
      renderButton();
      expect(flat('btn-container').borderRadius).toBe(12);
    });

    it('takes its default height from the touch-target token, not a literal (AC4b)', () => {
      renderButton();
      expect(TOUCH_TARGET.min).toBe(47);
      expect(flat('btn-container').minHeight).toBe(TOUCH_TARGET.min);
    });

    it('is 52pt tall in its large (footer) size', () => {
      renderButton({ size: 'large' });
      expect(flat('btn-container').minHeight).toBe(52);
    });
  });
});
