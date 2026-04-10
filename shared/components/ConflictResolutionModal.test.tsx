import { fireEvent, render, screen } from '@testing-library/react-native';

import { ConflictResolutionModal } from './ConflictResolutionModal';

let mockIsDark = false;

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: mockIsDark
      ? {
          primary: '#4DA3FF',
          primaryDark: '#6DB8FF',
          success: '#30D158',
          error: '#FF453A',
          surface: '#1C1C1E',
          surfaceElevated: '#2C2C2E',
          textPrimary: '#F5F5F7',
          textSecondary: '#D9D9DE',
          textTertiary: '#8E8E93',
          border: '#38383A'
        }
      : {
          primary: '#1A73E8',
          primaryDark: '#1557B0',
          success: '#16A34A',
          error: '#DC2626',
          surface: '#FFFFFF',
          surfaceElevated: '#F5F5F5',
          textPrimary: '#1F1F24',
          textSecondary: '#66666B',
          textTertiary: '#B0B0B5',
          border: '#E5E5EB'
        },
    isDark: mockIsDark
  }),
  NEUTRAL_COLORS: {
    white: '#FFFFFF'
  }
}));

jest.mock('@/shared/theme/sync-tokens', () => ({
  SYNC_TOKENS: {
    modalBg: { light: '#FFFFFF', dark: '#1C1C1E' },
    modalOverlay: { light: 'rgba(0,0,0,0.5)', dark: 'rgba(0,0,0,0.7)' },
    keepBothTint: { light: '#34C759', dark: '#30D158' },
    conflictCardBg: { light: '#F5F5F7', dark: '#2C2C2E' },
    conflictAccent: { light: '#FF5B30', dark: '#FF453A' }
  }
}));

jest.mock('@/shared/theme/colors', () => ({
  NEUTRAL_COLORS: {
    white: '#FFFFFF'
  }
}));

jest.mock('@/shared/theme/spacing', () => ({
  TOUCH_TARGET: { min: 44, recommended: 48 },
  LAYOUT: { cardAspectRatio: 1.586 }
}));

const localCard = {
  name: 'Conad Card',
  points: 1500,
  barcodeTail: '4321',
  updatedAt: '2024-06-01 14:30',
  changedFields: ['points']
};

const cloudCard = {
  name: 'Conad Card',
  points: 1200,
  barcodeTail: '4321',
  updatedAt: '2024-06-01 15:00',
  changedFields: ['points']
};

describe('ConflictResolutionModal', () => {
  const defaultProps = {
    visible: true,
    localCard,
    cloudCard,
    onKeepLocal: jest.fn(),
    onKeepCloud: jest.fn(),
    onKeepBoth: jest.fn(),
    onDecideLater: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with correct title and subtitle when visible', () => {
    render(<ConflictResolutionModal {...defaultProps} />);

    expect(screen.getByTestId('conflict-modal-title').props.children).toBe('Resolve sync conflict');
    expect(screen.getByTestId('conflict-modal-subtitle')).toBeTruthy();
  });

  it('renders both comparison cards', () => {
    render(<ConflictResolutionModal {...defaultProps} />);

    expect(screen.getByTestId('conflict-local-card')).toBeTruthy();
    expect(screen.getByTestId('conflict-cloud-card')).toBeTruthy();
  });

  it('renders all action buttons', () => {
    render(<ConflictResolutionModal {...defaultProps} />);

    expect(screen.getByTestId('conflict-keep-local-button')).toBeTruthy();
    expect(screen.getByTestId('conflict-keep-cloud-button')).toBeTruthy();
    expect(screen.getByTestId('conflict-keep-both-button')).toBeTruthy();
    expect(screen.getByTestId('conflict-decide-later')).toBeTruthy();
  });

  it('calls onKeepLocal when Keep local is pressed', () => {
    render(<ConflictResolutionModal {...defaultProps} />);

    fireEvent.press(screen.getByTestId('conflict-keep-local-button'));
    expect(defaultProps.onKeepLocal).toHaveBeenCalledTimes(1);
  });

  it('calls onKeepCloud when Keep cloud is pressed', () => {
    render(<ConflictResolutionModal {...defaultProps} />);

    fireEvent.press(screen.getByTestId('conflict-keep-cloud-button'));
    expect(defaultProps.onKeepCloud).toHaveBeenCalledTimes(1);
  });

  it('calls onKeepBoth when Keep both is pressed', () => {
    render(<ConflictResolutionModal {...defaultProps} />);

    fireEvent.press(screen.getByTestId('conflict-keep-both-button'));
    expect(defaultProps.onKeepBoth).toHaveBeenCalledTimes(1);
  });

  it('calls onDecideLater when Decide later is pressed', () => {
    render(<ConflictResolutionModal {...defaultProps} />);

    fireEvent.press(screen.getByTestId('conflict-decide-later'));
    expect(defaultProps.onDecideLater).toHaveBeenCalledTimes(1);
  });

  it('has accessibilityViewIsModal on content', () => {
    render(<ConflictResolutionModal {...defaultProps} />);

    const content = screen.getByTestId('conflict-modal-content');
    expect(content.props.accessibilityViewIsModal).toBe(true);
  });

  it('buttons have accessibility hints', () => {
    render(<ConflictResolutionModal {...defaultProps} />);

    expect(screen.getByTestId('conflict-keep-local-button').props.accessibilityHint).toBe(
      'Replaces cloud version with local data'
    );
    expect(screen.getByTestId('conflict-keep-cloud-button').props.accessibilityHint).toBe(
      'Replaces local data with cloud version'
    );
  });

  it('does not render content when visible is false', () => {
    render(<ConflictResolutionModal {...defaultProps} visible={false} />);

    // React Native Modal with visible=false does not render children in test env
    expect(screen.queryByTestId('conflict-modal-title')).toBeNull();
  });
});

describe('ConflictResolutionModal (dark mode)', () => {
  beforeEach(() => {
    mockIsDark = true;
  });

  afterEach(() => {
    mockIsDark = false;
  });

  it('uses dark mode modal background token', () => {
    render(
      <ConflictResolutionModal
        visible={true}
        localCard={{
          name: 'Test',
          barcodeTail: '1234',
          updatedAt: '2024-01-01',
          changedFields: []
        }}
        cloudCard={{
          name: 'Test',
          barcodeTail: '1234',
          updatedAt: '2024-01-02',
          changedFields: []
        }}
        onKeepLocal={jest.fn()}
        onKeepCloud={jest.fn()}
        onKeepBoth={jest.fn()}
        onDecideLater={jest.fn()}
      />
    );

    const content = screen.getByTestId('conflict-modal-content');
    expect(content.props.style.backgroundColor).toBe('#1C1C1E');
  });
});
