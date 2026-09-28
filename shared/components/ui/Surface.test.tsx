/**
 * Surface — the hairline-outlined surface (Story 22.1, AC1, AC3).
 *
 * Through the real `StoryDecorator`, because a surface is defined by its two colours: white on
 * cream with a #D6D6CB rule in light, ink on black with a #3A3A48 rule in dark.
 */
import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { Surface } from './Surface';
import { StoryDecorator } from '../../../.storybook/StoryDecorator';

type Scheme = 'light' | 'dark';

const flat = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style) as Record<string, unknown>;

describe('Surface', () => {
  it.each<[Scheme, string, string]>([
    ['light', '#FFFFFF', '#D6D6CB'],
    ['dark', '#181824', '#3A3A48']
  ])(
    'is a %s surface with a 1pt hairline outline and the 16pt card radius',
    (scheme, fill, rule) => {
      render(
        <StoryDecorator theme={scheme}>
          <Surface testID="surface">
            <Text>Row</Text>
          </Surface>
        </StoryDecorator>
      );
      expect(flat('surface')).toMatchObject({
        backgroundColor: fill,
        borderColor: rule,
        borderWidth: 1,
        borderRadius: 16,
        overflow: 'hidden'
      });
    }
  );

  // AC3 — depth is the outline, never a shadow.
  it('draws no shadow and no elevation (AC3)', () => {
    render(
      <StoryDecorator>
        <Surface testID="surface">
          <Text>Row</Text>
        </Surface>
      </StoryDecorator>
    );
    const style = flat('surface');
    for (const key of [
      'shadowColor',
      'shadowOffset',
      'shadowOpacity',
      'shadowRadius',
      'elevation'
    ]) {
      expect(style[key]).toBeUndefined();
    }
  });

  it('rules a full-width hairline between consecutive rows when divided', () => {
    render(
      <StoryDecorator theme="dark">
        <Surface testID="surface" divided>
          <Text>One</Text>
          <Text>Two</Text>
          {null}
          {false}
          <Text>Three</Text>
        </Surface>
      </StoryDecorator>
    );
    // Three real rows → two rules; the null and false children neither render nor get a rule.
    const rules = screen.getAllByTestId('surface-divider');
    expect(rules).toHaveLength(2);
    for (const rule of rules) {
      expect(StyleSheet.flatten(rule.props.style)).toMatchObject({
        height: 1,
        backgroundColor: '#3A3A48'
      });
      expect(StyleSheet.flatten(rule.props.style).marginHorizontal).toBeUndefined();
    }
    expect(screen.getByText('One')).toBeTruthy();
    expect(screen.getByText('Three')).toBeTruthy();
  });

  it('draws no rules unless asked', () => {
    render(
      <StoryDecorator>
        <Surface testID="surface">
          <Text>One</Text>
          <Text>Two</Text>
        </Surface>
      </StoryDecorator>
    );
    expect(screen.queryAllByTestId('surface-divider')).toHaveLength(0);
  });
});
