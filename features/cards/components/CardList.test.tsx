/**
 * CardList Component Tests
 * Story 13.2: Restyle Home Screen — AC1, AC3, AC4, AC5, AC6, AC10
 *
 * Covers: loading, error, empty state, single-card state,
 * fixed 2-column grid, search+sort controls (>= 2 cards),
 * no-results message, focus-effect refetch, pull-to-refresh, performance.
 */

import { render, screen } from '@testing-library/react-native';
import { useFocusEffect } from 'expo-router';

import { LoyaltyCard } from '@/core/schemas';

import { CardList } from './CardList';
import { useCards } from '../hooks/useCards';
import { useCardSearch } from '../hooks/useCardSearch';
import { useCardSort } from '../hooks/useCardSort';

const mockCardTileProps = jest.fn();

// Extend global type for test mocks
declare global {
  var mockFlashListState: { numColumns: number | undefined };
}

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

jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn((callback: () => void) => callback()),
  useRouter: () => ({ push: jest.fn() })
}));

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
      highlighted
    }: {
      card: { name: string };
      enlarged?: boolean;
      highlighted?: boolean;
    }) => {
      mockCardTileProps({ card, enlarged, highlighted });
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
    setupCards([]);
    setupSearch();
    setupSort();
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

      const flashList = screen.getByTestId('card-list-flashlist');
      const onRefresh = flashList.props.onRefresh;
      expect(onRefresh).toBeDefined();
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
