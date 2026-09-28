/**
 * PrimaryActionFooter — Story 22.1 (AC1, AC2).
 *
 * Rendered through the real `StoryDecorator` stack rather than a mocked `useTheme`, because
 * the rule's colour is the whole point in dark mode (#3A3A48, not the light #D6D6CB) and only
 * the real `ThemeProvider` flips it. The decorator also supplies a deterministic 34pt bottom
 * inset, which the inset assertions below read.
 */
import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { PrimaryActionFooter } from './PrimaryActionFooter';
import { StoryDecorator } from '../../../.storybook/StoryDecorator';

type Props = Partial<React.ComponentProps<typeof PrimaryActionFooter>>;

const renderFooter = (props: Props = {}, theme: 'light' | 'dark' = 'light') =>
  render(
    <StoryDecorator theme={theme}>
      <PrimaryActionFooter testID="footer" {...props}>
        <Text>Done</Text>
      </PrimaryActionFooter>
    </StoryDecorator>
  );

const flat = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style) as Record<string, unknown>;

/**
 * The root's direct children, in order. These are RN's composite `View`s, not host nodes, so they
 * are compared by `testID` and style rather than by identity — comparing test instances directly
 * makes a failing matcher try to deep-copy both trees for its diff.
 */
const rootChild = (index: number) => {
  const child = screen.getByTestId('footer').children[index];
  if (typeof child === 'string' || child === undefined) throw new Error(`no child ${index}`);
  return child;
};

/** The padded region holding the actions: the root's second child, after the rule. */
const actionsRegion = () => StyleSheet.flatten(rootChild(1).props.style) as Record<string, number>;

describe('PrimaryActionFooter', () => {
  it('renders its action', () => {
    renderFooter();
    expect(screen.getByText('Done')).toBeTruthy();
  });

  // The design system's one hard rule for this region, and the reason it is a primitive at all.
  it('is laid out in flow — never positioned absolutely, never shrunk away (AC2)', () => {
    renderFooter();
    const root = flat('footer');
    expect(root.position).not.toBe('absolute');
    expect(root.flexShrink).toBe(0);
    expect(flat('footer-rule').position).not.toBe('absolute');
    expect(actionsRegion().position).not.toBe('absolute');
  });

  it('draws a 1pt hairline rule that spans the full width, outside the margins', () => {
    renderFooter();
    const rule = flat('footer-rule');
    expect(rule.height).toBe(1);
    expect(rule.marginHorizontal).toBeUndefined();
    // The rule is the root's FIRST child, so the actions' padding cannot inset it.
    expect(rootChild(0).props.testID).toBe('footer-rule');
  });

  it.each([
    ['light', '#D6D6CB'],
    ['dark', '#3A3A48']
  ] as const)('paints the rule with the %s hairline colour', (scheme, hex) => {
    renderFooter({}, scheme);
    expect(flat('footer-rule').backgroundColor).toBe(hex);
  });

  it('pads the action by the 24pt screen margin, plus the bottom inset', () => {
    renderFooter();
    const region = actionsRegion();
    expect(region.padding).toBe(24);
    // 24 of margin, then the 34pt home-indicator inset the decorator supplies.
    expect(region.paddingBottom).toBe(24 + 34);
  });

  it('takes the 16pt card-grid margin when asked (the wallet empty state)', () => {
    renderFooter({ margin: 'grid' });
    const region = actionsRegion();
    expect(region.padding).toBe(16);
    expect(region.paddingBottom).toBe(16 + 34);
  });

  it('leaves the inset to a screen that already pads its bottom edge', () => {
    renderFooter({ insetBottom: false });
    expect(actionsRegion().paddingBottom).toBe(24);
  });

  it('spaces stacked actions on the 8pt grid', () => {
    renderFooter();
    expect(actionsRegion().gap).toBe(8);
  });
});
