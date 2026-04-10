import { render, screen } from '@testing-library/react-native';

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

  it('highlights changed fields with bold font weight', () => {
    render(
      <ConflictComparisonCard testID="card" label="This device" icon="smartphone" data={baseCard} />
    );

    // Points is a changed field — should have bold weight
    const pointsText = screen.getByTestId('card-points');
    expect(pointsText.props.style.fontWeight).toBe('700');
  });

  it('does not highlight unchanged fields', () => {
    render(
      <ConflictComparisonCard testID="card" label="This device" icon="smartphone" data={baseCard} />
    );

    // Name is not a changed field — should have normal weight
    const nameText = screen.getByTestId('card-name');
    expect(nameText.props.style.fontWeight).toBe('600');
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
    expect(card.props.style.backgroundColor).toBe('#2C2C2E');
  });
});
