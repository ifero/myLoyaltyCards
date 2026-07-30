/**
 * CardList Component Tests
 * Story 13.2: Restyle Home Screen — AC1, AC3, AC4, AC5, AC6, AC10
 * Story 16.22: Fix card-grid tile overlap — AC1, AC2, AC3, AC4, AC10
 *
 * Covers: loading, error, empty state, single-card state,
 * fixed 2-column grid, search+sort controls (>= 2 cards),
 * no-results message, focus-effect refetch, pull-to-refresh, performance,
 * and viewport-derived tile sizing across window widths.
 */

import { act, render, screen } from '@testing-library/react-native';
import { useFocusEffect } from 'expo-router';
import { Dimensions, StyleSheet, type EmitterSubscription } from 'react-native';

import { LoyaltyCard } from '@/core/schemas';

import { CardList } from './CardList';
import { useCards } from '../hooks/useCards';
import { useCardSearch } from '../hooks/useCardSearch';
import { useCardSort } from '../hooks/useCardSort';
import {
  GUTTER,
  LIST_CONTENT_PADDING,
  NUM_COLUMNS,
  SCREEN_MARGIN,
  SINGLE_TILE_HEIGHT,
  SINGLE_TILE_WIDTH
} from '../utils/gridLayout';

const mockCardTileProps = jest.fn();

// Extend global type for test mocks
declare global {
  var mockFlashListState: {
    numColumns: number | undefined;
    contentContainerStyle: unknown;
    listHeaderStyle: unknown;
  };
}

/**
 * Drive the viewport width. `useWindowDimensions` reads `Dimensions.get('window')`
 * in its state initialiser, so spying on the public Dimensions API exercises the
 * real hook rather than replacing it. The hook's effect re-reads and compares the
 * four metrics by value, so a stable return value cannot loop.
 */
const mockDimensionsGet = jest.spyOn(Dimensions, 'get');
const setWindowWidth = (width: number) =>
  mockDimensionsGet.mockReturnValue({ width, height: 844, scale: 3, fontScale: 1 });

/** The reference width the 171 x 140 design was measured on. */
const REFERENCE_WIDTH = 390;

// ── Hook mocks ──────────────────────────────────────────────────
jest.mock('../hooks/useCards');
const mockUseCards = useCards as jest.MockedFunction<typeof useCards>;

jest.mock('../hooks/useCardSearch');
const mockUseCardSearch = useCardSearch as jest.MockedFunction<typeof useCardSearch>;

jest.mock('../hooks/useCardSort');
const mockUseCardSort = useCardSort as jest.MockedFunction<typeof useCardSort>;

// ── External dependency mocks ──────────────────────────────────
const mockForceSync = jest.fn().mockResolvedValue(undefined);
jest.mock('@/shared/hooks/useCloudSync', () => ({
  useCloudSync: () => ({
    isSyncing: false,
    syncError: null,
    downloadedCount: 0,
    triggerSync: jest.fn(),
    forceSync: mockForceSync,
    clearSyncError: jest.fn()
  })
}));

/**
 * Real `useFocusEffect` re-runs its callback when the callback's identity
 * changes — on focus — NOT on every render. Modelling that with `useEffect`
 * keeps `refetch` call counts meaningful: a mock that fired per render let the
 * two `setIsRefreshing` re-renders inside `handleRefresh` bump `refetch` on
 * their own, which masked a pull-to-refresh that never called `refetch` at all.
 */
jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockReact = require('react');
  return {
    useFocusEffect: jest.fn((callback: () => void) => {
      mockReact.useEffect(callback, [callback]);
    }),
    useRouter: () => ({ push: jest.fn() })
  };
});

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      background: '#FAFAFA',
      surface: '#FFFFFF',
      textPrimary: '#1F2937',
      textSecondary: '#6B7280',
      primary: '#1A73E8',
      border: '#E5E7EB'
    },
    isDark: false
  })
}));

// ── Child component mocks (isolate orchestration) ──────────────
jest.mock('./CardTile', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    CardTile: ({
      card,
      enlarged,
      highlighted,
      tileWidth,
      tileHeight
    }: {
      card: { name: string };
      enlarged?: boolean;
      highlighted?: boolean;
      tileWidth?: number;
      tileHeight?: number;
    }) => {
      mockCardTileProps({ card, enlarged, highlighted, tileWidth, tileHeight });
      return React.createElement(
        Text,
        { testID: enlarged ? 'card-tile-enlarged' : 'card-tile' },
        card.name
      );
    },
    TILE_WIDTH: 171,
    TILE_HEIGHT: 140,
    TILE_RADIUS: 16,
    SINGLE_TILE_WIDTH: 220,
    SINGLE_TILE_HEIGHT: 180,
    SINGLE_TILE_RADIUS: 20
  };
});

jest.mock('./EmptyState', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    EmptyState: () => React.createElement(Text, { testID: 'empty-state' }, 'No cards yet')
  };
});

jest.mock('./SearchBar', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TextInput } = require('react-native');
  return {
    SearchBar: ({ value, onChangeText }: { value: string; onChangeText: (t: string) => void }) =>
      React.createElement(TextInput, {
        testID: 'search-bar',
        accessibilityLabel: 'Search loyalty cards',
        value,
        onChangeText,
        placeholder: 'Search'
      })
  };
});

jest.mock('./SortFilterRow', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    SortFilterRow: ({ cardCount }: { cardCount: number }) =>
      React.createElement(Text, { testID: 'sort-filter-row' }, `${cardCount} loyalty cards`)
  };
});

// ── Fixtures ────────────────────────────────────────────────────
const makeCard = (overrides: Partial<LoyaltyCard> = {}): LoyaltyCard => ({
  id: '1',
  name: 'Apple Store',
  barcode: '1234567890',
  barcodeFormat: 'CODE128',
  brandId: null,
  color: 'blue',
  isFavorite: false,
  lastUsedAt: null,
  usageCount: 5,
  createdAt: '2026-01-07T10:00:00Z',
  updatedAt: '2026-01-07T10:00:00Z',
  ...overrides
});

const twoCards: LoyaltyCard[] = [
  makeCard({ id: '1', name: 'Apple Store', usageCount: 5 }),
  makeCard({
    id: '2',
    name: 'Best Buy',
    barcode: '0987654321',
    barcodeFormat: 'EAN13',
    color: 'red',
    usageCount: 3
  })
];

// ── Default hook return values ──────────────────────────────────
const mockRefetch = jest.fn();
const mockSetSearchQuery = jest.fn();
const mockClearSearch = jest.fn();
const mockSetSortOption = jest.fn();

const defaultSearch = {
  searchQuery: '',
  setSearchQuery: mockSetSearchQuery,
  clearSearch: mockClearSearch,
  filterCards: (cards: LoyaltyCard[]) => cards
};

const defaultSort = {
  sortOption: 'frequent' as const,
  setSortOption: mockSetSortOption,
  sortCards: (cards: LoyaltyCard[]) => cards,
  sortLabel: 'Most Used',
  sortLabels: { frequent: 'Most Used', recent: 'Recently Added', az: 'A → Z' }
};

// ── Helpers ─────────────────────────────────────────────────────
const setupCards = (
  cards: LoyaltyCard[],
  opts?: { isLoading?: boolean; error?: string | null }
) => {
  mockUseCards.mockReturnValue({
    cards,
    isLoading: opts?.isLoading ?? false,
    error: opts?.error ?? null,
    refetch: mockRefetch
  });
};

const setupSearch = (overrides: Partial<typeof defaultSearch> = {}) =>
  mockUseCardSearch.mockReturnValue({ ...defaultSearch, ...overrides });

const setupSort = (overrides: Partial<typeof defaultSort> = {}) =>
  mockUseCardSort.mockReturnValue({ ...defaultSort, ...overrides });

// ── Tests ───────────────────────────────────────────────────────
describe('CardList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.mockFlashListState.numColumns = undefined;
    global.mockFlashListState.contentContainerStyle = undefined;
    global.mockFlashListState.listHeaderStyle = undefined;
    setWindowWidth(REFERENCE_WIDTH);
    setupCards([]);
    setupSearch();
    setupSort();
  });

  afterAll(() => {
    mockDimensionsGet.mockRestore();
  });

  // ── Loading state ──
  describe('Loading state', () => {
    it('shows ActivityIndicator while loading', () => {
      setupCards([], { isLoading: true });
      const { UNSAFE_getByType } = render(<CardList />);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      expect(UNSAFE_getByType(require('react-native').ActivityIndicator)).toBeTruthy();
    });
  });

  // ── Error state ──
  describe('Error state', () => {
    it('displays error message', () => {
      setupCards([], { error: 'Database error' });
      render(<CardList />);
      expect(screen.getByText('Database error')).toBeTruthy();
    });
  });

  // ── Empty state (AC4) ──
  describe('Empty state — AC4', () => {
    it('shows EmptyState via ListEmptyComponent when 0 cards', () => {
      setupCards([]);
      render(<CardList />);
      expect(screen.getByText('No cards yet')).toBeTruthy();
    });
  });

  // ── Single-card state (AC5) ──
  describe('Single-card state — AC5', () => {
    it('renders enlarged centered tile for single card', () => {
      setupCards([makeCard()]);
      render(<CardList />);
      expect(screen.getByText('Apple Store')).toBeTruthy();
    });

    it('shows tip text when only one card', () => {
      setupCards([makeCard()]);
      render(<CardList />);
      expect(screen.getByText('Tap + to add more cards to your wallet')).toBeTruthy();
    });

    it('does not show search or sort controls for single card', () => {
      setupCards([makeCard()]);
      render(<CardList />);
      expect(screen.queryByLabelText('Search loyalty cards')).toBeNull();
    });

    it('passes highlighted=true for matching single-card highlight id', () => {
      setupCards([makeCard({ id: 'single-1' })]);
      render(<CardList highlightCardId="single-1" />);

      expect(mockCardTileProps).toHaveBeenCalledWith(
        expect.objectContaining({
          highlighted: true,
          enlarged: true
        })
      );
    });
  });

  // ── Fixed 2-column grid (AC1) ──
  describe('Fixed 2-column grid — AC1', () => {
    it('always passes numColumns=2 to FlashList', () => {
      setupCards(twoCards);
      render(<CardList />);
      expect(global.mockFlashListState.numColumns).toBe(2);
    });

    it('renders all cards in the grid', () => {
      setupCards(twoCards);
      render(<CardList />);
      expect(screen.getByText('Apple Store')).toBeTruthy();
      expect(screen.getByText('Best Buy')).toBeTruthy();
    });

    it('highlights only the just-added card in the grid', () => {
      // The single-card branch already had this covered; the GRID branch did not, even
      // though Story 16.22 rewrote the very `renderItem` callback that carries it. A
      // dropped `highlightCardId` dependency would silently kill the just-added green
      // highlight for the common 2+-card view with every other test still green.
      setupCards(twoCards);
      render(<CardList highlightCardId="2" />);

      const byName = new Map(
        mockCardTileProps.mock.calls.map(([props]) => [props.card.name, props])
      );
      expect(byName.get('Best Buy')).toMatchObject({ highlighted: true, enlarged: undefined });
      expect(byName.get('Apple Store')).toMatchObject({ highlighted: false });
    });
  });

  // ── Viewport-derived tile sizing — Story 16.22 (AC1, AC2, AC3, AC4, AC10) ──
  describe('Viewport-derived tile sizing — Story 16.22', () => {
    /** Size props CardList handed the first tile it rendered. */
    const capturedTileSize = (): { tileWidth?: number; tileHeight?: number } => {
      const call = mockCardTileProps.mock.calls[0]?.[0];
      expect(call).toBeDefined();
      return call;
    };

    /**
     * Room left for a tile inside its grid cell, derived independently from
     * FlashList's own model: it measures `boundedSize` with a probe view inside
     * the padded content container, splits it by column count, and the tile
     * wrapper then spends GUTTER / 2 on each side.
     */
    const cellContentWidth = (windowWidth: number) =>
      (windowWidth - 2 * LIST_CONTENT_PADDING) / NUM_COLUMNS - GUTTER;

    it('passes exactly 171 x 140 at the 390 dp design reference width (AC4)', () => {
      setWindowWidth(REFERENCE_WIDTH);
      setupCards(twoCards);
      render(<CardList />);

      expect(capturedTileSize()).toMatchObject({ tileWidth: 171, tileHeight: 140 });
    });

    it('shrinks the tile to fit at 360 dp, where the fixed 171 pt tile overlapped (AC1)', () => {
      setWindowWidth(360);
      setupCards(twoCards);
      render(<CardList />);

      expect(capturedTileSize()).toMatchObject({ tileWidth: 156, tileHeight: 128 });
    });

    it('re-derives the tile size when the viewport changes on an ALREADY-MOUNTED list (AC1)', () => {
      // This is the case `useWindowDimensions()` was chosen for over a module-scope
      // `Dimensions.get()`: an Android Display-size or font-scale change while the
      // screen is mounted. `useFocusEffect` keeps this screen alive across tab focus
      // rather than remounting it, so a stale `renderItem` closure would keep
      // painting overlapping tiles for the lifetime of the mount — with every
      // render-time test above still passing.
      const changeHandlers: ((payload: { window: { width: number } }) => void)[] = [];
      const addEventListener = jest
        .spyOn(Dimensions, 'addEventListener')
        .mockImplementation((_type, handler) => {
          changeHandlers.push(handler as (payload: { window: { width: number } }) => void);
          // Only `.remove()` is exercised; the rest of EmitterSubscription is irrelevant here.
          return { remove: jest.fn() } as unknown as EmitterSubscription;
        });

      try {
        setWindowWidth(REFERENCE_WIDTH);
        setupCards(twoCards);
        render(<CardList />);
        expect(capturedTileSize()).toMatchObject({ tileWidth: 171, tileHeight: 140 });

        mockCardTileProps.mockClear();
        setWindowWidth(360);
        act(() => {
          changeHandlers.forEach((handler) => handler({ window: Dimensions.get('window') }));
        });

        expect(capturedTileSize()).toMatchObject({ tileWidth: 156, tileHeight: 128 });
      } finally {
        addEventListener.mockRestore();
      }
    });

    it.each([320, 340, 360, 375, 390, 412, 430])(
      'passes a tile width that fits its own grid cell at %i dp (AC2)',
      (windowWidth) => {
        setWindowWidth(windowWidth);
        setupCards(twoCards);
        render(<CardList />);

        const { tileWidth } = capturedTileSize();
        expect(tileWidth).toBeDefined();
        expect(tileWidth!).toBeLessThanOrEqual(cellContentWidth(windowWidth));
        expect(2 * tileWidth! + 2 * SCREEN_MARGIN + GUTTER).toBeLessThanOrEqual(windowWidth);
      }
    );

    it('splits the 16 pt screen margin between the list content and the tile wrapper (AC3)', () => {
      setupCards(twoCards);
      render(<CardList />);

      // The list keeps only the remainder; the rest lives on each tile wrapper, so
      // adjacent wrappers form a 16 pt gutter and the outer edges still total 16 pt.
      const listContent = StyleSheet.flatten(global.mockFlashListState.contentContainerStyle) as {
        paddingHorizontal?: number;
      };
      expect(listContent.paddingHorizontal).toBe(LIST_CONTENT_PADDING);
    });

    it('keeps the search/sort header at the same 16 pt visual margin as the grid (AC3)', () => {
      setupCards(twoCards);
      render(<CardList />);

      // Required companion to the listContent padding change: the header lives in the
      // same padded container as the tiles but has no tileWrapper of its own, so it
      // needs the wrapper's share of the margin or it widens to 8 pt.
      const header = StyleSheet.flatten(global.mockFlashListState.listHeaderStyle) as {
        paddingHorizontal?: number;
      };
      expect(header.paddingHorizontal).toBe(GUTTER / 2);
      expect(LIST_CONTENT_PADDING + (header.paddingHorizontal ?? 0)).toBe(SCREEN_MARGIN);
    });

    it('sizes the enlarged single-card tile from the viewport too (AC10)', () => {
      setupCards([makeCard()]);
      render(<CardList />);

      expect(capturedTileSize()).toMatchObject({
        tileWidth: SINGLE_TILE_WIDTH,
        tileHeight: SINGLE_TILE_HEIGHT
      });
    });

    it('clamps the enlarged single-card tile on a viewport too narrow for 220 pt (AC10)', () => {
      setWindowWidth(240);
      setupCards([makeCard()]);
      render(<CardList />);

      expect(capturedTileSize().tileWidth).toBe(240 - 2 * SCREEN_MARGIN);
    });

    it('reads the window dimensions once, not once per rendered tile', () => {
      // Guards against `CardList` re-deriving the viewport per tile (e.g. moving the
      // read inside `renderItem`). Note `./CardTile` is mocked in this suite, so a
      // `useWindowDimensions()` added to the real CardTile would NOT be caught here —
      // the anti-pattern table is the guard for that.
      const manyCards = Array.from({ length: 20 }, (_, i) =>
        makeCard({ id: `${i}`, name: `Store ${i}` })
      );
      setupCards(manyCards);
      mockDimensionsGet.mockClear();
      setWindowWidth(360);
      render(<CardList />);

      expect(mockCardTileProps).toHaveBeenCalledTimes(manyCards.length);
      // Bounded against the TILE COUNT rather than useWindowDimensions' internal
      // read count (2 per mount today), so the assertion survives an RN internals
      // change or a StrictMode double-render while still catching the regression it
      // exists for: a per-tile read would scale with the list. The lower bound keeps
      // it from passing vacuously if the hook is dropped altogether.
      expect(mockDimensionsGet.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(mockDimensionsGet.mock.calls.length).toBeLessThan(manyCards.length);
    });
  });

  // ── Search controls (AC3) ──
  describe('Search controls — AC3', () => {
    it('renders SearchBar when >= 2 cards', () => {
      setupCards(twoCards);
      render(<CardList />);
      expect(screen.getByLabelText('Search loyalty cards')).toBeTruthy();
    });

    it('filters cards via useCardSearch.filterCards', () => {
      const filterFn = jest.fn((cards: LoyaltyCard[]) => [cards[0]!]);
      setupCards(twoCards);
      setupSearch({ searchQuery: 'apple', filterCards: filterFn });
      render(<CardList />);
      expect(filterFn).toHaveBeenCalledWith(twoCards);
    });

    it('shows no-results message when search yields 0 matches', () => {
      setupCards(twoCards);
      setupSearch({
        searchQuery: 'xyz',
        filterCards: () => []
      });
      setupSort({ sortCards: (c: LoyaltyCard[]) => c });
      render(<CardList />);
      expect(screen.getByText(/No cards matching "xyz"/)).toBeTruthy();
    });
  });

  // ── Sort controls (AC6) ──
  describe('Sort controls — AC6', () => {
    it('renders SortFilterRow when >= 2 cards', () => {
      setupCards(twoCards);
      render(<CardList />);
      expect(screen.getByText(/loyalty cards/i)).toBeTruthy();
    });

    it('passes sortCards result to FlashList data', () => {
      const reversed = [...twoCards].reverse();
      setupCards(twoCards);
      setupSort({ sortCards: () => reversed });
      const { toJSON } = render(<CardList />);
      const tree = JSON.stringify(toJSON());
      // Best Buy should appear before Apple Store in the tree
      expect(tree.indexOf('Best Buy')).toBeLessThan(tree.indexOf('Apple Store'));
    });
  });

  // ── Focus effect ──
  describe('Focus effect', () => {
    it('calls refetch when screen comes into focus', () => {
      setupCards(twoCards);
      render(<CardList />);
      expect(useFocusEffect).toHaveBeenCalled();
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  // ── Pull-to-refresh (AC10) ──
  describe('Pull-to-refresh — AC10', () => {
    it('calls forceSync and refetch on refresh', async () => {
      setupCards(twoCards);
      render(<CardList />);

      // `jest.setup.js` forwards `onRefresh` onto the mock FlashList's host
      // View, so this is the component's own `handleRefresh`.
      const onRefresh = screen.getByTestId('card-list-flashlist').props.onRefresh;

      // Drop the mount-time focus-effect call so both assertions below can only
      // be satisfied by `handleRefresh` itself.
      mockRefetch.mockClear();

      await act(async () => {
        await onRefresh();
      });

      expect(mockForceSync).toHaveBeenCalledTimes(1);
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  // ── Performance ──
  describe('Performance', () => {
    it('renders 50 cards without errors', () => {
      const manyCards = Array.from({ length: 50 }, (_, i) =>
        makeCard({ id: `${i}`, name: `Store ${i}` })
      );
      setupCards(manyCards);
      render(<CardList />);
      expect(screen.getByText('Store 0')).toBeTruthy();
    });
  });
});
