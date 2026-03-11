/**
 * SettingsScreen — Unit Tests
 * Story 6-11: Privacy & Consent (Data & Privacy section, Privacy Policy link)
 */

import { render, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import SettingsScreen from '../SettingsScreen';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      background: '#FFFFFF',
      surface: '#FAFAFA',
      textPrimary: '#000000',
      textSecondary: '#666666',
      primary: '#73A973',
      primaryDark: '#5c9a5c',
      border: '#E5E7EB'
    },
    isDark: false,
    colorScheme: 'light'
  })
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace })
}));

jest.mock('@/shared/supabase/auth', () => ({
  signOut: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('@/core/catalogue/catalogue-repository', () => ({
  catalogueRepository: {
    getVersion: () => '1.0.0'
  }
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---- Privacy Policy link ----

  it('renders the Privacy Policy link', () => {
    render(<SettingsScreen />);
    expect(screen.getByTestId('settings-privacy-policy')).toBeTruthy();
  });

  it('navigates to /privacy-policy on Privacy Policy press', () => {
    render(<SettingsScreen />);
    fireEvent.press(screen.getByTestId('settings-privacy-policy'));
    expect(mockPush).toHaveBeenCalledWith('/privacy-policy');
  });

  // ---- Data & Privacy section ----

  it('renders the Data & Privacy section', () => {
    render(<SettingsScreen />);
    expect(screen.getByTestId('settings-data-privacy-section')).toBeTruthy();
  });

  it('renders the What We Collect button', () => {
    render(<SettingsScreen />);
    expect(screen.getByTestId('settings-data-summary')).toBeTruthy();
    expect(screen.getByText('What We Collect')).toBeTruthy();
  });

  it('navigates to /data-summary on What We Collect press', () => {
    render(<SettingsScreen />);
    fireEvent.press(screen.getByTestId('settings-data-summary'));
    expect(mockPush).toHaveBeenCalledWith('/data-summary');
  });

  it('shows descriptive text under What We Collect', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('View a summary of the data we collect')).toBeTruthy();
  });

  // ---- Help & FAQ link ----

  it('renders the Help & FAQ link', () => {
    render(<SettingsScreen />);
    expect(screen.getByTestId('settings-help-faq')).toBeTruthy();
  });

  it('navigates to /help on Help & FAQ press', () => {
    render(<SettingsScreen />);
    fireEvent.press(screen.getByTestId('settings-help-faq'));
    expect(mockPush).toHaveBeenCalledWith('/help');
  });

  // ---- Guest mode badge ----

  it('renders the guest mode badge', () => {
    render(<SettingsScreen />);
    expect(screen.getByTestId('settings-guest-badge')).toBeTruthy();
  });

  // ---- Catalogue version ----

  it('displays catalogue version', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('Catalogue Version')).toBeTruthy();
    expect(screen.getByText('1.0.0')).toBeTruthy();
  });
});
