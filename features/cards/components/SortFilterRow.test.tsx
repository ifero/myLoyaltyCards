/**
 * SortFilterRow Component Tests
 * Story 13.2: Restyle Home Screen — AC6
 * Story 22.2: The wallet frames' sort row and its option-list sheet
 *
 * Rendered through the real `StoryDecorator` stack — the real `ThemeProvider` and the shared
 * `BottomSheet` with its safe-area insets — because which ROLE colours each part is the point of
 * half of these tests, and only dark mode tells `primary` (beam) from `textPrimary` (cream).
 */

import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { StoryDecorator } from '@/.storybook/StoryDecorator';

import { SortFilterRow } from './SortFilterRow';

type Scheme = 'light' | 'dark';

const ROLES: Record<Scheme, { primary: string; textPrimary: string; border: string }> = {
  light: { primary: '#181824', textPrimary: '#181824', border: '#D6D6CB' },
  dark: { primary: '#FCCC0C', textPrimary: '#F0F0E8', border: '#3A3A48' }
};

const sortLabels = {
  frequent: 'Frequently used',
  recent: 'Recently added',
  az: 'A-Z'
} as const;

const defaultProps = {
  cardCount: 8,
  sortOption: 'frequent' as const,
  onSortChange: jest.fn(),
  sortLabel: 'Frequently used',
  sortLabels
};

type RowProps = Partial<React.ComponentProps<typeof SortFilterRow>>;

const renderRow = (props: RowProps = {}, scheme: Scheme = 'light') =>
  render(
    <StoryDecorator theme={scheme}>
      <SortFilterRow {...defaultProps} {...props} />
    </StoryDecorator>
  );

const flat = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style) as Record<string, unknown>;

/** The glyphs are decorative — the button and the rows carry the names — so they are hidden. */
const glyph = (testID: string) =>
  screen.getByTestId(testID, { includeHiddenElements: true }).props as Record<string, unknown>;

const openSheet = () => fireEvent.press(screen.getByTestId('sort-filter-row-sort-button'));

describe('SortFilterRow', () => {
  describe('rendering', () => {
    it('displays card count as plural', () => {
      renderRow();
      expect(screen.getByText('8 cards')).toBeTruthy();
    });

    it('displays card count as singular for 1 card', () => {
      renderRow({ cardCount: 1 });
      expect(screen.getByText('1 card')).toBeTruthy();
    });

    // The I/O matrix's no-results row: a search that matches nothing still shows its count.
    it('displays a count of zero', () => {
      renderRow({ cardCount: 0 });
      expect(screen.getByText('0 cards')).toBeTruthy();
    });

    it('displays current sort label', () => {
      renderRow();
      expect(screen.getByText('Frequently used')).toBeTruthy();
    });
  });

  describe('the row — Story 22.2', () => {
    // The row is the touch target tall and carries no padding of its own.
    it('is the touch target tall, with no padding of its own', () => {
      renderRow();
      const row = flat('sort-filter-row');
      expect(row.paddingVertical).toBeUndefined();
      expect(row.padding).toBeUndefined();
      expect(flat('sort-filter-row-sort-button').minHeight).toBe(48);
    });

    // "A-Z" alone is about 43pt wide, under the touch target; the label stays right-aligned.
    it('keeps the sort button at least the touch target wide, its label to the right', () => {
      renderRow({ sortOption: 'az', sortLabel: 'A-Z' });
      expect(flat('sort-filter-row-sort-button')).toMatchObject({
        minWidth: 48,
        justifyContent: 'flex-end'
      });
    });

    it.each<Scheme>(['light', 'dark'])(
      'sets the count and the sort label in label-bold textPrimary in %s',
      (scheme) => {
        renderRow({}, scheme);
        for (const text of ['8 cards', 'Frequently used']) {
          expect(StyleSheet.flatten(screen.getByText(text).props.style)).toMatchObject({
            fontFamily: 'Inter',
            fontSize: 13,
            fontWeight: '600',
            color: ROLES[scheme].textPrimary
          });
        }
      }
    );

    it.each<Scheme>(['light', 'dark'])(
      'follows the label with a 14pt chevron in textPrimary in %s',
      (scheme) => {
        renderRow({}, scheme);
        expect(glyph('sort-filter-row-chevron')).toMatchObject({
          width: 14,
          height: 14,
          strokeWidth: 2,
          stroke: ROLES[scheme].textPrimary
        });
      }
    );
  });

  describe('the sort sheet — Story 22.2', () => {
    it('stays closed until the sort button is pressed', () => {
      renderRow();
      expect(screen.queryByText('Sort by')).toBeNull();
      expect(screen.queryByTestId('sort-filter-row-option-az')).toBeNull();
    });

    it('opens the shared sheet, titled "Sort by", listing the three sorts', () => {
      renderRow();
      openSheet();

      expect(screen.getByTestId('sort-filter-row-sheet')).toBeTruthy();
      expect(screen.getByText('Sort by').props.accessibilityRole).toBe('header');
      for (const option of ['frequent', 'recent', 'az'] as const) {
        expect(screen.getByTestId(`sort-filter-row-option-${option}`)).toBeTruthy();
      }
      expect(screen.getByText('Recently added')).toBeTruthy();
      expect(screen.getByText('A-Z')).toBeTruthy();
    });

    it('marks the current sort with a check and the selected state, and only it', () => {
      renderRow({ sortOption: 'recent', sortLabel: 'Recently added' });
      openSheet();

      expect(
        screen.getByTestId('sort-filter-row-option-recent').props.accessibilityState
      ).toMatchObject({ selected: true });
      expect(
        screen.getByTestId('sort-filter-row-option-recent-check', { includeHiddenElements: true })
      ).toBeTruthy();

      for (const option of ['frequent', 'az'] as const) {
        expect(
          screen.getByTestId(`sort-filter-row-option-${option}`).props.accessibilityState
        ).toMatchObject({ selected: false });
        expect(
          screen.queryByTestId(`sort-filter-row-option-${option}-check`, {
            includeHiddenElements: true
          })
        ).toBeNull();
      }
    });

    it.each<Scheme>(['light', 'dark'])(
      'draws rows of at least 48pt with rules edge to edge in %s',
      (scheme) => {
        renderRow({}, scheme);
        openSheet();

        for (const option of ['frequent', 'recent', 'az'] as const) {
          expect(flat(`sort-filter-row-option-${option}`)).toMatchObject({
            minHeight: 48,
            // The sheet pads 24; the rule spans it and the label comes back to the margin.
            marginHorizontal: -24,
            paddingHorizontal: 24,
            borderTopWidth: 1,
            borderTopColor: ROLES[scheme].border
          });
        }
      }
    );

    it.each<Scheme>(['light', 'dark'])(
      'sets the labels in body-lg textPrimary and the check at 24 in primary in %s',
      (scheme) => {
        renderRow({}, scheme);
        openSheet();

        expect(StyleSheet.flatten(screen.getByText('A-Z').props.style)).toMatchObject({
          fontFamily: 'Inter',
          fontSize: 17,
          fontWeight: '400',
          color: ROLES[scheme].textPrimary
        });
        expect(glyph('sort-filter-row-option-frequent-check')).toMatchObject({
          width: 24,
          height: 24,
          stroke: ROLES[scheme].primary
        });
      }
    );

    it('calls onSortChange with the choice and closes the sheet', () => {
      const onSortChange = jest.fn();
      renderRow({ onSortChange });
      openSheet();

      fireEvent.press(screen.getByTestId('sort-filter-row-option-az'));

      expect(onSortChange).toHaveBeenCalledTimes(1);
      expect(onSortChange).toHaveBeenCalledWith('az');
      expect(screen.queryByTestId('sort-filter-row-option-az')).toBeNull();
    });

    it('keeps the sort when the sheet is dismissed', () => {
      const onSortChange = jest.fn();
      renderRow({ onSortChange });
      openSheet();

      fireEvent.press(
        screen.getByTestId('sort-filter-row-sheet-scrim', { includeHiddenElements: true })
      );

      expect(onSortChange).not.toHaveBeenCalled();
      expect(screen.queryByTestId('sort-filter-row-option-az')).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('sort button has correct accessibilityLabel', () => {
      renderRow();

      const btn = screen.getByLabelText('Sort by Frequently used');
      expect(btn).toBeTruthy();
      expect(btn.props.accessibilityRole).toBe('button');
      expect(btn.props.accessibilityHint).toBe('Opens sort options');
    });

    it('count text has accessibility label', () => {
      renderRow();

      const count = screen.getByLabelText('8 cards');
      expect(count).toBeTruthy();
    });
  });
});
