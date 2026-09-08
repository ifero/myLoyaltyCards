/**
 * useBrightness nesting tests
 * Story 16.39: Full brightness on the card detail screen — AC5
 *
 * The card detail screen can hold brightness for as long as it is focused
 * (`useCardBrightnessBoost` — when the Settings toggle is on, or the button pressed),
 * and the fullscreen overlay it renders has maximised on its own since Story 2.5. So
 * from the moment Story 16.39 shipped, two independent `useBrightness` instances can be
 * live at once on the same screen.
 *
 * ⚠️ That nesting is the one thing about this story that could plausibly have gone
 * wrong, and it is not obvious from either call site. Each instance keeps its OWN
 * `originalBrightnessRef`, and the inner one samples the brightness that the outer
 * one has already pushed to 1.0 — so a naive reading says the overlay "restores" the
 * user to full brightness and the real level is lost for good.
 *
 * It is not lost, because the outer instance captured the real level first and its
 * ref is untouched by the inner one. This file proves that by driving the real
 * `useBrightness` through the exact sequence a user performs, rather than reasoning
 * about it in a comment: open card → enlarge → close → leave.
 *
 * Kept separate from `useBrightness.test.ts` so Story 2.5's suite stays a unit test
 * of one instance; this is about the composition Story 16.39 introduced.
 */

import { renderHook, act } from '@testing-library/react-native';

import { useBrightness } from './useBrightness';

const mockGetBrightnessAsync = jest.fn();
const mockSetBrightnessAsync = jest.fn();

jest.mock('expo-brightness', () => ({
  getBrightnessAsync: () => mockGetBrightnessAsync(),
  setBrightnessAsync: (value: number) => mockSetBrightnessAsync(value)
}));

/** The level the user actually had their phone on before opening the card. */
const USER_LEVEL = 0.35;

describe('useBrightness nesting — detail screen + fullscreen overlay (Story 16.39 AC5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetBrightnessAsync.mockResolvedValue(undefined);
    // Model a real device: reading the brightness returns whatever was last written.
    let current = USER_LEVEL;
    mockGetBrightnessAsync.mockImplementation(() => Promise.resolve(current));
    mockSetBrightnessAsync.mockImplementation((value: number) => {
      current = value;
      return Promise.resolve();
    });
  });

  it('returns the user to their own level after enlarge → close → leave', async () => {
    // The detail screen (outer) and the overlay it renders (inner) are separate
    // instances, exactly as they are in the component tree.
    const outer = renderHook(() => useBrightness());
    const inner = renderHook(() => useBrightness());

    // Screen gains focus.
    await act(async () => {
      await outer.result.current.maximize();
    });
    expect(mockSetBrightnessAsync).toHaveBeenLastCalledWith(1.0);

    // User taps the barcode to enlarge it. This instance samples 1.0, not 0.35.
    await act(async () => {
      await inner.result.current.maximize();
    });
    expect(mockSetBrightnessAsync).toHaveBeenLastCalledWith(1.0);

    // Overlay closed. Brightness must NOT drop — the barcode is still on screen
    // behind it, which is the whole point of the story.
    await act(async () => {
      await inner.result.current.restore();
    });
    expect(mockSetBrightnessAsync).toHaveBeenLastCalledWith(1.0);

    // Screen loses focus (back, or on to the edit form). Now — and only now — the
    // user's real level comes back. If the instances shared a ref, this would be 1.0
    // and the phone would be left at full brightness.
    await act(async () => {
      await outer.result.current.restore();
    });
    expect(mockSetBrightnessAsync).toHaveBeenLastCalledWith(USER_LEVEL);
  });

  it('returns the user to their own level when the overlay is never opened', async () => {
    const outer = renderHook(() => useBrightness());

    await act(async () => {
      await outer.result.current.maximize();
    });
    await act(async () => {
      await outer.result.current.restore();
    });

    expect(mockSetBrightnessAsync).toHaveBeenNthCalledWith(1, 1.0);
    expect(mockSetBrightnessAsync).toHaveBeenLastCalledWith(USER_LEVEL);
  });

  it('does not re-sample on a second maximise, so a re-focus cannot lose the level', async () => {
    // `useCardBrightnessBoost` maximises on every focus while boosted, and a blur→focus cycle
    // that skipped its restore would otherwise let the second maximise record 1.0 as
    // "the user's level". `useBrightness` guards this by only sampling when its ref
    // is empty; asserted here because the focus hook is what makes it reachable.
    const outer = renderHook(() => useBrightness());

    await act(async () => {
      await outer.result.current.maximize();
      await outer.result.current.maximize();
    });
    await act(async () => {
      await outer.result.current.restore();
    });

    expect(mockSetBrightnessAsync).toHaveBeenLastCalledWith(USER_LEVEL);
  });
});
