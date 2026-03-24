/**
 * Settings Screen Tests
 * Story 4.3: Help & FAQ Access
 * Story 6-4: Privacy Policy link
 * Story 6.9: Logout — conditional rendering and confirmation dialog
 * Story 6-11: Privacy & Consent — Data & Privacy section gated by auth
 */

import { render, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

import SettingsScreen from './SettingsScreen';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace
  })
}));

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      background: '#FAFAFA',
      surface: '#FFFFFF',
      textPrimary: '#1F2937',
      textSecondary: '#6B7280',
      primary: '#73A973',
      primaryDark: '#5C8A5C',
      border: '#E5E7EB'
    },
    isDark: false
  })
}));

jest.mock('@/core/catalogue/catalogue-repository', () => ({
  catalogueRepository: {
    getVersion: () => '2026-02-01'
  }
}));

const mockSignOut = jest.fn();
const mockDeleteAccount = jest.fn();
jest.mock('@/shared/supabase/auth', () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
  deleteAccount: (...args: unknown[]) => mockDeleteAccount(...args)
}));

const mockUseAuthState = jest.fn();
jest.mock('@/shared/supabase/useAuthState', () => ({
  useAuthState: () => mockUseAuthState()
}));

const mockClearLastSyncAt = jest.fn();
jest.mock('@/core/sync/sync-timestamp', () => ({
  clearLastSyncAt: (...args: unknown[]) => mockClearLastSyncAt(...args)
}));

jest.spyOn(Alert, 'alert');

// ---------------------------------------------------------------------------
// Story 4.3: Help & FAQ
// ---------------------------------------------------------------------------

describe('SettingsScreen — Story 4.3', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthState.mockReturnValue({ authState: 'guest', isAuthenticated: false });
  });

  it('navigates to Help & FAQ from Settings', () => {
    const { getByTestId } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('settings-help-faq'));

    expect(mockPush).toHaveBeenCalledWith('/help');
  });
});

// ---------------------------------------------------------------------------
// Story 6-4: Privacy Policy link
// ---------------------------------------------------------------------------

describe('SettingsScreen — Story 6-4: Privacy Policy link', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthState.mockReturnValue({ authState: 'guest', isAuthenticated: false });
  });

  it('renders the Privacy Policy link', () => {
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('settings-privacy-policy')).toBeTruthy();
  });

  it('navigates to /privacy-policy when pressed', () => {
    const { getByTestId } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('settings-privacy-policy'));

    expect(mockPush).toHaveBeenCalledWith('/privacy-policy');
  });

  it('has proper accessibility attributes', () => {
    const { getByLabelText } = render(<SettingsScreen />);
    expect(getByLabelText('Privacy Policy')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Story 6.9: Logout — Conditional rendering
// ---------------------------------------------------------------------------

describe('SettingsScreen — Story 6.9: Guest mode rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthState.mockReturnValue({ authState: 'guest', isAuthenticated: false });
  });

  it('shows guest badge when in guest mode', () => {
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('settings-guest-badge')).toBeTruthy();
  });

  it('shows Create Account section when in guest mode', () => {
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('settings-create-account-section')).toBeTruthy();
  });

  it('shows Sign In section when in guest mode', () => {
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('settings-sign-in-section')).toBeTruthy();
  });

  it('hides Sign Out button when in guest mode', () => {
    const { queryByTestId } = render(<SettingsScreen />);
    expect(queryByTestId('settings-sign-out-section')).toBeNull();
  });
});

describe('SettingsScreen — Story 6.9: Authenticated mode rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthState.mockReturnValue({ authState: 'authenticated', isAuthenticated: true });
  });

  it('shows Sign Out button when authenticated', () => {
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('settings-sign-out-button')).toBeTruthy();
  });

  it('hides guest badge when authenticated', () => {
    const { queryByTestId } = render(<SettingsScreen />);
    expect(queryByTestId('settings-guest-badge')).toBeNull();
  });

  it('hides Create Account section when authenticated', () => {
    const { queryByTestId } = render(<SettingsScreen />);
    expect(queryByTestId('settings-create-account-section')).toBeNull();
  });

  it('hides Sign In section when authenticated', () => {
    const { queryByTestId } = render(<SettingsScreen />);
    expect(queryByTestId('settings-sign-in-section')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Story 6.9: Logout — Confirmation dialog and sign-out flow
// ---------------------------------------------------------------------------

describe('SettingsScreen — Story 6.9: Sign-out flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthState.mockReturnValue({ authState: 'authenticated', isAuthenticated: true });
  });

  it('shows confirmation dialog when Sign Out is pressed', () => {
    const { getByTestId } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('settings-sign-out-button'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Sign Out?',
      'You will return to guest mode. Your cards will remain on this device.',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({
          text: 'Sign Out',
          style: 'destructive',
          onPress: expect.any(Function)
        })
      ])
    );
  });

  it('calls signOut and navigates to home on confirmation', async () => {
    mockSignOut.mockResolvedValue({ success: true, data: undefined });

    const { getByTestId } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('settings-sign-out-button'));

    // Extract and call the onPress from the "Sign Out" button in the alert
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const signOutButton = alertCall[2].find((btn: { text: string }) => btn.text === 'Sign Out');

    await act(async () => {
      await signOutButton.onPress();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockClearLastSyncAt).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('shows error message when sign-out fails', async () => {
    mockSignOut.mockResolvedValue({
      success: false,
      error: { message: 'Network failure' }
    });

    const { getByTestId } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('settings-sign-out-button'));

    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const signOutButton = alertCall[2].find((btn: { text: string }) => btn.text === 'Sign Out');

    await act(async () => {
      await signOutButton.onPress();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(getByTestId('sign-out-error')).toBeTruthy();
  });

  it('does not sign out when Cancel is pressed in confirmation', () => {
    const { getByTestId } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('settings-sign-out-button'));

    // Verify Cancel button has cancel style
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const cancelButton = alertCall[2].find((btn: { text: string }) => btn.text === 'Cancel');

    expect(cancelButton.style).toBe('cancel');
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Story 6.9: Loading state
// ---------------------------------------------------------------------------

describe('SettingsScreen — Story 6.9: Loading state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthState.mockReturnValue({ authState: 'loading', isAuthenticated: false });
  });

  it('hides guest sections while loading', () => {
    const { queryByTestId } = render(<SettingsScreen />);
    expect(queryByTestId('settings-guest-badge')).toBeNull();
  });

  it('hides sign-out section while loading', () => {
    const { queryByTestId } = render(<SettingsScreen />);
    expect(queryByTestId('settings-sign-out-section')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Story 6-11: Data & Privacy section — auth-gated
// ---------------------------------------------------------------------------

describe('SettingsScreen — Story 6-11: Data & Privacy section (authenticated)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthState.mockReturnValue({ authState: 'authenticated', isAuthenticated: true });
  });

  it('renders the Data & Privacy section when authenticated', () => {
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('settings-data-privacy-section')).toBeTruthy();
  });

  it('renders the What We Collect button when authenticated', () => {
    const { getByTestId, getByText } = render(<SettingsScreen />);
    expect(getByTestId('settings-data-summary')).toBeTruthy();
    expect(getByText('What We Collect')).toBeTruthy();
  });

  it('navigates to /data-summary on What We Collect press', () => {
    const { getByTestId } = render(<SettingsScreen />);
    fireEvent.press(getByTestId('settings-data-summary'));
    expect(mockPush).toHaveBeenCalledWith('/data-summary');
  });

  it('shows descriptive text under What We Collect', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('View a summary of the data we collect')).toBeTruthy();
  });
});

describe('SettingsScreen — Story 6-11: Data & Privacy section (guest)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthState.mockReturnValue({ authState: 'guest', isAuthenticated: false });
  });

  it('hides the Data & Privacy section in guest mode', () => {
    const { queryByTestId } = render(<SettingsScreen />);
    expect(queryByTestId('settings-data-privacy-section')).toBeNull();
  });

  it('hides the What We Collect button in guest mode', () => {
    const { queryByTestId } = render(<SettingsScreen />);
    expect(queryByTestId('settings-data-summary')).toBeNull();
  });
});

describe('SettingsScreen — Story 6-11: Data & Privacy section (loading)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthState.mockReturnValue({ authState: 'loading', isAuthenticated: false });
  });

  it('hides the Data & Privacy section while loading', () => {
    const { queryByTestId } = render(<SettingsScreen />);
    expect(queryByTestId('settings-data-privacy-section')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Story 6.10: Delete Account — Visibility
// ---------------------------------------------------------------------------

describe('SettingsScreen — Story 6.10: Delete Account visibility', () => {
  it('shows Delete Account button when authenticated', () => {
    mockUseAuthState.mockReturnValue({ authState: 'authenticated', isAuthenticated: true });
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('settings-delete-account-button')).toBeTruthy();
  });

  it('hides Delete Account button in guest mode', () => {
    mockUseAuthState.mockReturnValue({ authState: 'guest', isAuthenticated: false });
    const { queryByTestId } = render(<SettingsScreen />);
    expect(queryByTestId('settings-delete-account-section')).toBeNull();
  });

  it('hides Delete Account button while loading', () => {
    mockUseAuthState.mockReturnValue({ authState: 'loading', isAuthenticated: false });
    const { queryByTestId } = render(<SettingsScreen />);
    expect(queryByTestId('settings-delete-account-section')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Story 6.10: Delete Account — Multi-step confirmation
// ---------------------------------------------------------------------------

describe('SettingsScreen — Story 6.10: Multi-step confirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthState.mockReturnValue({ authState: 'authenticated', isAuthenticated: true });
  });

  it('shows Step 1 alert when Delete Account is pressed', () => {
    const { getByTestId } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('settings-delete-account-button'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete Account?',
      expect.stringContaining('permanently delete'),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({
          text: 'Continue',
          style: 'destructive',
          onPress: expect.any(Function)
        })
      ])
    );
  });

  it('opens confirmation modal on Step 1 Continue', () => {
    const { getByTestId } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('settings-delete-account-button'));

    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const continueBtn = alertCall[2].find((btn: { text: string }) => btn.text === 'Continue');

    act(() => {
      continueBtn.onPress();
    });

    expect(getByTestId('delete-account-modal')).toBeTruthy();
    expect(getByTestId('delete-confirm-input')).toBeTruthy();
  });

  it('has delete button disabled when confirm text is empty', () => {
    const { getByTestId } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('settings-delete-account-button'));
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const continueBtn = alertCall[2].find((btn: { text: string }) => btn.text === 'Continue');
    act(() => {
      continueBtn.onPress();
    });

    const deleteBtn = getByTestId('delete-confirm-button');
    expect(deleteBtn.props.accessibilityState?.disabled ?? deleteBtn.props.disabled).toBeTruthy();
  });

  it('has delete button disabled when confirm text is wrong', () => {
    const { getByTestId } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('settings-delete-account-button'));
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const continueBtn = alertCall[2].find((btn: { text: string }) => btn.text === 'Continue');
    act(() => {
      continueBtn.onPress();
    });

    fireEvent.changeText(getByTestId('delete-confirm-input'), 'WRONG');

    const deleteBtn = getByTestId('delete-confirm-button');
    expect(deleteBtn.props.accessibilityState?.disabled ?? deleteBtn.props.disabled).toBeTruthy();
  });

  it('enables delete button when confirm text is "DELETE"', () => {
    const { getByTestId } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('settings-delete-account-button'));
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const continueBtn = alertCall[2].find((btn: { text: string }) => btn.text === 'Continue');
    act(() => {
      continueBtn.onPress();
    });

    fireEvent.changeText(getByTestId('delete-confirm-input'), 'DELETE');

    const deleteBtn = getByTestId('delete-confirm-button');
    // When enabled: disabled prop is either false or undefined
    const isDisabled = deleteBtn.props.accessibilityState?.disabled ?? deleteBtn.props.disabled;
    expect(isDisabled).toBeFalsy();
  });

  it('closes modal when Cancel is pressed in confirmation step', () => {
    const { getByTestId, queryByTestId } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('settings-delete-account-button'));
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const continueBtn = alertCall[2].find((btn: { text: string }) => btn.text === 'Continue');
    act(() => {
      continueBtn.onPress();
    });

    fireEvent.press(getByTestId('delete-cancel-button'));

    expect(queryByTestId('delete-account-modal')?.props.visible ?? false).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Story 6.10: Delete Account — Execution flow
// ---------------------------------------------------------------------------

describe('SettingsScreen — Story 6.10: Deletion execution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseAuthState.mockReturnValue({ authState: 'authenticated', isAuthenticated: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const openConfirmModal = (getByTestId: ReturnType<typeof render>['getByTestId']) => {
    fireEvent.press(getByTestId('settings-delete-account-button'));
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const continueBtn = alertCall[2].find((btn: { text: string }) => btn.text === 'Continue');
    act(() => {
      continueBtn.onPress();
    });
    fireEvent.changeText(getByTestId('delete-confirm-input'), 'DELETE');
  };

  it('shows loading indicator during deletion', async () => {
    // Never resolving promise to keep loading state
    mockDeleteAccount.mockReturnValue(new Promise(() => {}));

    const { getByTestId } = render(<SettingsScreen />);
    openConfirmModal(getByTestId);

    await act(async () => {
      fireEvent.press(getByTestId('delete-confirm-button'));
    });

    expect(getByTestId('delete-loading-indicator')).toBeTruthy();
  });

  it('shows success banner and navigates on successful deletion', async () => {
    mockDeleteAccount.mockResolvedValue({ success: true, data: undefined });

    const { getByTestId } = render(<SettingsScreen />);
    openConfirmModal(getByTestId);

    await act(async () => {
      fireEvent.press(getByTestId('delete-confirm-button'));
    });

    expect(getByTestId('delete-account-success')).toBeTruthy();
    expect(mockClearLastSyncAt).toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('shows error message when deletion fails', async () => {
    mockDeleteAccount.mockResolvedValue({
      success: false,
      error: { message: 'Something went wrong. Please try again.' }
    });

    const { getByTestId } = render(<SettingsScreen />);
    openConfirmModal(getByTestId);

    await act(async () => {
      fireEvent.press(getByTestId('delete-confirm-button'));
    });

    expect(getByTestId('delete-account-error')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not navigate when deletion fails', async () => {
    mockDeleteAccount.mockResolvedValue({
      success: false,
      error: { message: 'Network error' }
    });

    const { getByTestId } = render(<SettingsScreen />);
    openConfirmModal(getByTestId);

    await act(async () => {
      fireEvent.press(getByTestId('delete-confirm-button'));
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });
});
