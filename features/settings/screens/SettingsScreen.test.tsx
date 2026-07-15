import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import SettingsScreen from './SettingsScreen';

const mockPush = jest.fn();
const mockReplace = jest.fn();

const mockUseAuthState = jest.fn();
const mockGetSession = jest.fn();
const mockSignOut = jest.fn();
const mockDeleteAccount = jest.fn();
const mockSendPasswordResetOtp = jest.fn();
const mockClearLastSyncAt = jest.fn();
const mockShowToast = jest.fn();

const mockUseThemePreference = jest.fn();
const mockUseLanguagePreference = jest.fn();
const mockUseExportData = jest.fn();
const mockUseImportData = jest.fn();
const mockUseSyncTrigger = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace })
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { version: '1.4.0' }
  }
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 })
}));

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      background: '#FFFFFF',
      surface: '#FFFFFF',
      surfaceElevated: '#F5F5F5',
      textPrimary: '#111111',
      textSecondary: '#777777',
      textTertiary: '#999999',
      border: '#E5E5EB',
      primary: '#1A73E8',
      error: '#DC2626',
      success: '#16A34A'
    }
  })
}));

jest.mock('@/shared/supabase/useAuthState', () => ({
  useAuthState: () => mockUseAuthState()
}));

jest.mock('@/shared/supabase/auth', () => ({
  getSession: () => mockGetSession(),
  signOut: () => mockSignOut(),
  deleteAccount: () => mockDeleteAccount(),
  sendPasswordResetOtp: (...args: unknown[]) => mockSendPasswordResetOtp(...args)
}));

jest.mock('@/shared/toast', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args)
}));

jest.mock('@/core/sync/sync-timestamp', () => ({
  clearLastSyncAt: () => mockClearLastSyncAt()
}));

jest.mock('@/core/catalogue/catalogue-repository', () => ({
  catalogueRepository: { getVersion: () => 'v3 · Mar 2026' }
}));

jest.mock('../hooks/useThemePreference', () => ({
  useThemePreference: () => mockUseThemePreference()
}));

jest.mock('../hooks/useLanguagePreference', () => ({
  useLanguagePreference: () => mockUseLanguagePreference()
}));

jest.mock('../hooks/useExportData', () => ({
  useExportData: () => mockUseExportData()
}));

jest.mock('../hooks/useImportData', () => ({
  useImportData: () => mockUseImportData()
}));

jest.mock('../hooks/useSyncTrigger', () => ({
  useSyncTrigger: () => mockUseSyncTrigger()
}));

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseThemePreference.mockReturnValue({
      themePreference: 'system',
      themePreferenceLabel: 'System',
      isThemePickerOpen: false,
      openThemePicker: jest.fn(),
      closeThemePicker: jest.fn(),
      selectTheme: jest.fn()
    });

    mockUseLanguagePreference.mockReturnValue({
      languageCode: 'en',
      languageName: 'English',
      supportedLanguages: [{ code: 'en', name: 'English' }],
      isLanguagePickerOpen: false,
      openLanguagePicker: jest.fn(),
      closeLanguagePicker: jest.fn(),
      selectLanguage: jest.fn()
    });

    mockUseExportData.mockReturnValue({
      cardCount: 2,
      hasCards: true,
      isExporting: false,
      exportError: null,
      refreshCardCount: jest.fn().mockResolvedValue(undefined),
      exportCards: jest.fn().mockResolvedValue(true)
    });

    mockUseImportData.mockReturnValue({
      preview: null,
      errorState: null,
      isPreparing: false,
      isImporting: false,
      pickImportFile: jest.fn(),
      confirmImport: jest.fn(),
      closePreview: jest.fn(),
      closeError: jest.fn()
    });

    mockUseSyncTrigger.mockReturnValue({
      isSyncing: false,
      syncLabel: 'just now',
      triggerSync: jest.fn()
    });

    mockGetSession.mockResolvedValue({
      success: true,
      data: { user: { email: 'maria@gmail.com' } }
    });

    mockSignOut.mockResolvedValue({ success: true, data: undefined });
    mockDeleteAccount.mockResolvedValue({ success: true, data: undefined });
    mockSendPasswordResetOtp.mockResolvedValue({ success: true, data: undefined });
    mockClearLastSyncAt.mockResolvedValue(undefined);
  });

  it('renders guest account section when unauthenticated', () => {
    mockUseAuthState.mockReturnValue({ isAuthenticated: false, authState: 'guest' });

    const { getByTestId, queryByTestId } = render(<SettingsScreen />);

    expect(getByTestId('settings-guest-card')).toBeTruthy();
    expect(queryByTestId('settings-account-card')).toBeNull();
    // Change Password is an account-only action — never shown to guests (AC1).
    expect(queryByTestId('settings-change-password-row')).toBeNull();
  });

  it('renders signed-in account section when authenticated', async () => {
    mockUseAuthState.mockReturnValue({ isAuthenticated: true, authState: 'authenticated' });

    const { getByTestId } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByTestId('settings-account-card')).toBeTruthy();
    });
  });

  it('navigates to create-account from guest CTA', () => {
    mockUseAuthState.mockReturnValue({ isAuthenticated: false, authState: 'guest' });

    const { getByTestId } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('settings-create-account-button'));

    expect(mockPush).toHaveBeenCalledWith('/create-account');
  });

  it('starts the import flow from the import action row', () => {
    const pickImportFile = jest.fn();
    mockUseAuthState.mockReturnValue({ isAuthenticated: false, authState: 'guest' });
    mockUseImportData.mockReturnValue({
      preview: null,
      errorState: null,
      isPreparing: false,
      isImporting: false,
      pickImportFile,
      confirmImport: jest.fn(),
      closePreview: jest.fn(),
      closeError: jest.fn()
    });

    const { getByTestId } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('settings-import-row'));

    expect(pickImportFile).toHaveBeenCalled();
  });

  it('renders import sheets from hook state', () => {
    mockUseAuthState.mockReturnValue({ isAuthenticated: false, authState: 'guest' });
    mockUseImportData.mockReturnValue({
      preview: {
        fileName: 'my-cards-backup.json',
        totalCards: 8,
        newCardsCount: 5,
        duplicateCount: 3,
        invalidCount: 1,
        importableCards: []
      },
      errorState: {
        title: 'Invalid File',
        message: "This file doesn't contain valid card data. Please select a different file."
      },
      isPreparing: false,
      isImporting: false,
      pickImportFile: jest.fn(),
      confirmImport: jest.fn(),
      closePreview: jest.fn(),
      closeError: jest.fn()
    });

    const { getByText } = render(<SettingsScreen />);

    expect(getByText('Import Cards')).toBeTruthy();
    expect(getByText('Invalid File')).toBeTruthy();
  });

  it('opens sign out sheet and signs out', async () => {
    mockUseAuthState.mockReturnValue({ isAuthenticated: true, authState: 'authenticated' });

    const { getByTestId } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('settings-signout-row'));
    fireEvent.press(getByTestId('signout-confirm'));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('still navigates when clearLastSyncAt fails after sign-out success', async () => {
    mockUseAuthState.mockReturnValue({ isAuthenticated: true, authState: 'authenticated' });
    mockClearLastSyncAt.mockRejectedValueOnce(new Error('storage unavailable'));

    const { getByTestId } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('settings-signout-row'));
    fireEvent.press(getByTestId('signout-confirm'));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('still navigates when clearLastSyncAt fails after delete success', async () => {
    mockUseAuthState.mockReturnValue({ isAuthenticated: true, authState: 'authenticated' });
    mockClearLastSyncAt.mockRejectedValueOnce(new Error('storage unavailable'));

    const { getByTestId } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('settings-delete-row'));
    fireEvent.press(getByTestId('delete-continue-step1'));
    fireEvent.changeText(getByTestId('delete-confirm-input'), 'DELETE');
    fireEvent.press(getByTestId('delete-confirm-step2'));

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('starts change-password: sends the OTP and routes to recovery-otp tagged change-password (AC2)', async () => {
    mockUseAuthState.mockReturnValue({ isAuthenticated: true, authState: 'authenticated' });

    const { getByTestId, getByText } = render(<SettingsScreen />);

    // Wait for the session email to load so the guard passes.
    await waitFor(() => expect(getByText('maria@gmail.com')).toBeTruthy());

    fireEvent.press(getByTestId('settings-change-password-row'));

    await waitFor(() => {
      expect(mockSendPasswordResetOtp).toHaveBeenCalledWith('maria@gmail.com');
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/recovery-otp',
        params: expect.objectContaining({ email: 'maria@gmail.com', origin: 'change-password' })
      });
    });
  });

  it('ignores a second Change Password tap while the first send is in flight', async () => {
    mockUseAuthState.mockReturnValue({ isAuthenticated: true, authState: 'authenticated' });
    let resolveSend: (value: unknown) => void = () => {};
    mockSendPasswordResetOtp.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSend = resolve;
        })
    );

    const { getByTestId, getByText } = render(<SettingsScreen />);

    await waitFor(() => expect(getByText('maria@gmail.com')).toBeTruthy());

    // A rapid double tap must not fire two OTP sends (no duplicate emails).
    fireEvent.press(getByTestId('settings-change-password-row'));
    fireEvent.press(getByTestId('settings-change-password-row'));

    expect(mockSendPasswordResetOtp).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSend({ success: true, data: undefined });
    });
  });

  it('shows an error toast and does not navigate when the OTP send fails (AC5)', async () => {
    mockUseAuthState.mockReturnValue({ isAuthenticated: true, authState: 'authenticated' });
    mockSendPasswordResetOtp.mockResolvedValue({
      success: false,
      error: { message: 'rate limited' }
    });

    const { getByTestId, getByText } = render(<SettingsScreen />);

    await waitFor(() => expect(getByText('maria@gmail.com')).toBeTruthy());

    fireEvent.press(getByTestId('settings-change-password-row'));

    await waitFor(() => {
      expect(mockSendPasswordResetOtp).toHaveBeenCalledWith('maria@gmail.com');
      expect(mockShowToast).toHaveBeenCalledWith({
        title: 'Unable to send the verification code. Please try again.',
        preset: 'error'
      });
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows an error toast when the OTP send throws unexpectedly', async () => {
    mockUseAuthState.mockReturnValue({ isAuthenticated: true, authState: 'authenticated' });
    mockSendPasswordResetOtp.mockRejectedValue(new Error('boom'));

    const { getByTestId, getByText } = render(<SettingsScreen />);

    await waitFor(() => expect(getByText('maria@gmail.com')).toBeTruthy());

    fireEvent.press(getByTestId('settings-change-password-row'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith({
        title: 'Unable to send the verification code. Please try again.',
        preset: 'error'
      });
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('surfaces feedback and does not send when the session email has not loaded', async () => {
    mockUseAuthState.mockReturnValue({ isAuthenticated: true, authState: 'authenticated' });
    mockGetSession.mockResolvedValue({ success: true, data: { user: { email: undefined } } });

    const { getByTestId } = render(<SettingsScreen />);

    // The row renders immediately (fallback email), but with no real email the
    // guard must block the send AND give feedback rather than a dead tap.
    fireEvent.press(getByTestId('settings-change-password-row'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith({
        title: 'Unable to send the verification code. Please try again.',
        preset: 'error'
      });
    });
    expect(mockSendPasswordResetOtp).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
