/**
 * EmptyState Component Tests
 * Story 13.2: Restyle Home Screen — AC4, AC7, AC9
 * Story 22.2: Frame B of the wallet frames
 *
 * Rendered through the real `StoryDecorator` stack: the real `ThemeProvider` for the role colours,
 * and safe-area insets for the shared footer, which pads the bottom inset below its button.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';

import { StoryDecorator } from '@/.storybook/StoryDecorator';

import { EmptyState } from './EmptyState';

type Scheme = 'light' | 'dark';

const ROLES: Record<Scheme, { textPrimary: string; textSecondary: string; primary: string }> = {
  light: { textPrimary: '#181824', textSecondary: '#55555F', primary: '#181824' },
  dark: { textPrimary: '#F0F0E8', textSecondary: '#B5B5AB', primary: '#FCCC0C' }
};

const renderEmptyState = (
  props: React.ComponentProps<typeof EmptyState> = {},
  scheme: Scheme = 'light'
) =>
  render(
    <StoryDecorator theme={scheme}>
      <EmptyState {...props} />
    </StoryDecorator>
  );

const flat = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style) as Record<string, unknown>;

describe('EmptyState', () => {
  describe('Rendering — AC4', () => {
    it('renders title "No cards yet"', () => {
      renderEmptyState();
      const title = screen.getByText('No cards yet');
      expect(title).toBeTruthy();
      expect(title.props.accessibilityRole).toBe('header');
    });

    it('renders encouraging subtitle with rewards copy', () => {
      renderEmptyState();
      expect(
        screen.getByText('Add your first loyalty card and\nnever miss rewards at checkout')
      ).toBeTruthy();
    });

    it('renders the frame CTA copy', () => {
      renderEmptyState();
      expect(screen.getByText('Add your first card')).toBeTruthy();
    });

    it('does not render any emoji', () => {
      const { toJSON } = renderEmptyState();
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('💳');
    });
  });

  describe('Navigation — AC4', () => {
    it('navigates to add-card screen when CTA is pressed', () => {
      renderEmptyState();
      fireEvent.press(screen.getByTestId('empty-state-cta'));
      expect(useRouter().push).toHaveBeenCalledWith('/add-card');
    });
  });

  describe('Accessibility — AC9', () => {
    it('title has header accessibility role', () => {
      renderEmptyState();
      const title = screen.getByText('No cards yet');
      expect(title.props.accessibilityRole).toBe('header');
    });
  });

  describe('Frame B — Story 22.2', () => {
    // Type only: the illustration and its accent dots in two brands' colours are gone.
    it('draws no illustration', () => {
      const { toJSON } = renderEmptyState();
      expect(JSON.stringify(toJSON())).not.toContain('RNSVG');
      expect(screen.queryByLabelText('Wallet illustration')).toBeNull();
    });

    it.each<Scheme>(['light', 'dark'])(
      'sets the title in headline-md textPrimary and the subtitle in body-md textSecondary in %s',
      (scheme) => {
        renderEmptyState({}, scheme);
        expect(StyleSheet.flatten(screen.getByText('No cards yet').props.style)).toMatchObject({
          fontFamily: 'Space Grotesk',
          fontSize: 24,
          fontWeight: '700',
          textAlign: 'center',
          color: ROLES[scheme].textPrimary
        });
        expect(
          StyleSheet.flatten(
            screen.getByText('Add your first loyalty card and\nnever miss rewards at checkout')
              .props.style
          )
        ).toMatchObject({
          fontFamily: 'Inter',
          fontSize: 15,
          textAlign: 'center',
          color: ROLES[scheme].textSecondary
        });
      }
    );

    it('centres the two lines in a scroll area that grows to the footer', () => {
      renderEmptyState();
      const content = StyleSheet.flatten(
        screen.UNSAFE_getByType(ScrollView).props.contentContainerStyle
      ) as Record<string, unknown>;
      expect(content).toMatchObject({
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16
      });
    });

    // The footer is the page's last region, in flow — a flex sibling AFTER the scroll area,
    // never positioned over it.
    it('anchors the footer as a flex sibling below the scroll area, never absolutely', () => {
      renderEmptyState();
      const root = screen.getByTestId('empty-state');
      expect(flat('empty-state').flex).toBe(1);

      const children = root.children as { props: { testID?: string } }[];
      expect(children.map((child) => child.props.testID)).toEqual([
        'empty-state-scroll',
        'empty-state-footer'
      ]);
      expect(flat('empty-state-footer').position).toBeUndefined();
    });

    it('draws the footer as a hairline over the button, on the 16pt grid margin', () => {
      renderEmptyState();
      expect(flat('empty-state-footer-rule')).toMatchObject({
        height: 1,
        backgroundColor: '#D6D6CB'
      });

      // The padded region holding the button is the footer's second child, after the rule: 16 on
      // the grid margin, plus the 34pt bottom inset the decorator supplies below it.
      const actions = screen.getByTestId('empty-state-footer').children[1];
      if (typeof actions === 'string' || actions === undefined)
        throw new Error('no actions region');
      expect(StyleSheet.flatten(actions.props.style)).toMatchObject({
        padding: 16,
        paddingBottom: 16 + 34
      });
    });

    it.each<Scheme>(['light', 'dark'])(
      'holds the primary action, 52pt tall and full width, in %s',
      (scheme) => {
        renderEmptyState({}, scheme);
        expect(flat('empty-state-cta-container')).toMatchObject({
          minHeight: 52,
          backgroundColor: ROLES[scheme].primary
        });
        expect(flat('empty-state-cta').width).toBe('100%');
      }
    );

    it('hands the wallet pull-to-refresh to its scroll area', () => {
      const onRefresh = jest.fn();
      renderEmptyState({
        refreshControl: <RefreshControl refreshing={false} onRefresh={onRefresh} />
      });

      const refreshControl = screen.UNSAFE_getByType(ScrollView).props.refreshControl;
      expect(refreshControl.props.onRefresh).toBe(onRefresh);
    });
  });
});
