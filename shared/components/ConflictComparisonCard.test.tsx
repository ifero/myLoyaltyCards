import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ConflictComparisonCard } from './ConflictComparisonCard';

let mockIsDark = false;

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: mockIsDark
      ? { primary: '#4DA3FF', textPrimary: '#F5F5F7', textSecondary: '#D9D9DE' }
      : { primary: '#1A73E8', textPrimary: '#1F1F24', textSecondary: '#66666B' },
    isDark: mockIsDark
  })
}));

jest.mock('@/shared/theme/sync-tokens', () => ({
  SYNC_TOKENS: {
    conflictCardBg: { light: '#F5F5F7', dark: '#2C2C2E' },
    conflictAccent: { light: '#FF5B30', dark: '#FF453A' }
  }
}));

const baseCard = {
  name: 'Conad Card',
  points: 1500,
  barcodeTail: '4321',
  updatedAt: '2024-06-01 14:30',
  changedFields: ['points']
};

describe('ConflictComparisonCard', () => {
  it('renders label and icon', () => {
    render(
      <ConflictComparisonCard testID="card" label="This device" icon="smartphone" data={baseCard} />
    );

    expect(screen.getByTestId('card-label').props.children).toBe('This device');
    expect(screen.getByTestId('card-icon')).toBeTruthy();
  });

  it('renders card data fields', () => {
    render(<ConflictComparisonCard testID="card" label="Cloud" icon="cloud" data={baseCard} />);

    expect(screen.getByTestId('card-name').props.children).toBe('Conad Card');
    expect(screen.getByTestId('card-points').props.children).toBe(1500);
    expect(screen.getByTestId('card-barcode').props.children).toEqual(['•••', '4321']);
    expect(screen.getByTestId('card-updated')).toBeTruthy();
  });

  it('highlights changed fields with a heavier weight than an unchanged value', () => {
    render(
      <ConflictComparisonCard testID="card" label="This device" icon="smartphone" data={baseCard} />
    );

    // Points is a changed field — semibold, where an unchanged value is regular. 600 rather
    // than 700: only the weights the type scale uses are bundled (Story 21.6).
    const pointsText = screen.getByTestId('card-points');
    expect(pointsText.props.style.fontWeight).toBe('600');
  });

  it('keeps an unchanged value at the regular weight', () => {
    render(
      <ConflictComparisonCard
        testID="card"
        label="This device"
        icon="smartphone"
        data={{ ...baseCard, changedFields: [] }}
      />
    );

    expect(screen.getByTestId('card-points').props.style.fontWeight).toBe('400');
  });

  it('does not highlight unchanged fields', () => {
    render(
      <ConflictComparisonCard testID="card" label="This device" icon="smartphone" data={baseCard} />
    );

    // Name is not a changed field — the regular weight every unchanged field shares
    const nameText = screen.getByTestId('card-name');
    expect(nameText.props.style.fontWeight).toBe('400');
  });

  it('highlights a changed name with the weight step as well as the accent colour', () => {
    render(
      <ConflictComparisonCard
        testID="card"
        label="This device"
        icon="smartphone"
        data={{ ...baseCard, changedFields: ['name'] }}
      />
    );

    const nameText = screen.getByTestId('card-name');
    expect(nameText.props.style.fontWeight).toBe('600');
    expect(nameText.props.style.color).not.toBe(
      screen.getByTestId('card-points').props.style.color
    );
  });

  it('omits points row when points is undefined', () => {
    const cardWithoutPoints = { ...baseCard, points: undefined };

    render(
      <ConflictComparisonCard testID="card" label="Cloud" icon="cloud" data={cardWithoutPoints} />
    );

    expect(screen.queryByTestId('card-points')).toBeNull();
  });

  it('has descriptive accessibility label', () => {
    render(
      <ConflictComparisonCard testID="card" label="This device" icon="smartphone" data={baseCard} />
    );

    const card = screen.getByTestId('card');
    expect(card.props.accessibilityLabel).toContain('Conad Card');
    expect(card.props.accessibilityLabel).toContain('4321');
  });
});

describe('ConflictComparisonCard (dark mode)', () => {
  beforeEach(() => {
    mockIsDark = true;
  });

  afterEach(() => {
    mockIsDark = false;
  });

  it('uses dark mode card background token', () => {
    render(
      <ConflictComparisonCard
        testID="card"
        label="Cloud"
        icon="cloud"
        data={{
          name: 'Test',
          barcodeTail: '1234',
          updatedAt: '2024-01-01',
          changedFields: []
        }}
      />
    );

    const card = screen.getByTestId('card');
    expect(StyleSheet.flatten(card.props.style).backgroundColor).toBe('#2C2C2E');
  });
});
