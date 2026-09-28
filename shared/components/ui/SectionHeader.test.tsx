/**
 * SectionHeader — Story 22.1 (AC1, AC11).
 *
 * Through the real `StoryDecorator`, because the primitive now OWNS its colour: the four copies it
 * replaces split 1-vs-3 between `textTertiary` and `textSecondary`, injected inline at each call
 * site, and the ruling is `textSecondary` — the spec's muted #55555F — in both schemes.
 */
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { SectionHeader } from './SectionHeader';
import { StoryDecorator } from '../../../.storybook/StoryDecorator';

const renderHeader = (scheme: 'light' | 'dark' = 'light') =>
  render(
    <StoryDecorator theme={scheme}>
      <SectionHeader title="Preferences" testID="header" />
    </StoryDecorator>
  );

const style = () =>
  StyleSheet.flatten(screen.getByTestId('header').props.style) as Record<string, unknown>;

describe('SectionHeader', () => {
  it('is announced as a heading', () => {
    renderHeader();
    expect(screen.getByTestId('header').props.accessibilityRole).toBe('header');
  });

  // Story 21.6 AC8b decided the tier: `overline`, Inter 12/16 semibold, +0.05em = 0.6pt.
  it('sets the overline tier, uppercased by style', () => {
    renderHeader();
    expect(style()).toMatchObject({
      fontFamily: 'Inter',
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '600',
      letterSpacing: 0.6,
      textTransform: 'uppercase'
    });
  });

  // The string itself stays sentence case, so a screen reader reads "Preferences" rather than
  // spelling out capitals. `BrandList` used to uppercase the string AND the style.
  it('leaves the string in sentence case for assistive technology', () => {
    renderHeader();
    expect(screen.getByTestId('header').props.children).toBe('Preferences');
  });

  it.each([
    ['light', '#55555F'],
    ['dark', '#B5B5AB']
  ] as const)('owns its colour: textSecondary in %s', (scheme, hex) => {
    renderHeader(scheme);
    expect(style().color).toBe(hex);
  });
});
