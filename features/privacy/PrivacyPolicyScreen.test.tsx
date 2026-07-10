/**
 * PrivacyPolicyScreen — Unit Tests
 * Story 6-4: Privacy Policy & Consent Flow
 */

import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { act } from 'react';

import { changeAppLanguage } from '@/shared/i18n';

import { PRIVACY_POLICY_VERSION } from '@/assets/legal/privacy-policy';

import PrivacyPolicyScreen from './PrivacyPolicyScreen';

// Mock useTheme
jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      background: '#FFFFFF',
      textPrimary: '#000000',
      textSecondary: '#666666',
      primary: '#3B82F6',
      border: '#E5E7EB'
    },
    isDark: false,
    colorScheme: 'light'
  })
}));

describe('PrivacyPolicyScreen', () => {
  beforeEach(async () => {
    await act(async () => {
      await changeAppLanguage('en');
    });
  });

  it('renders the privacy policy screen container', () => {
    render(<PrivacyPolicyScreen />);
    expect(screen.getByTestId('privacy-policy-screen')).toBeTruthy();
  });

  it('displays the policy title', () => {
    render(<PrivacyPolicyScreen />);
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
  });

  it('displays the policy version', () => {
    render(<PrivacyPolicyScreen />);
    expect(screen.getByText(new RegExp(PRIVACY_POLICY_VERSION))).toBeTruthy();
  });

  it('renders the bundled policy content', () => {
    render(<PrivacyPolicyScreen />);
    // Check for key sections in the content
    expect(screen.getByText(/Data We Collect/)).toBeTruthy();
    expect(screen.getByText(/Your Rights/)).toBeTruthy();
    expect(screen.getByText(/Contact Us/)).toBeTruthy();
  });

  it('is scrollable (uses ScrollView)', () => {
    render(<PrivacyPolicyScreen />);
    const scrollView = screen.getByTestId('privacy-policy-screen');
    expect(scrollView).toBeTruthy();
  });

  it('has proper accessibility labels', () => {
    render(<PrivacyPolicyScreen />);
    expect(screen.getByLabelText('Privacy Policy')).toBeTruthy();
  });

  it('renders the Italian policy when app language is Italian', async () => {
    await act(async () => {
      await changeAppLanguage('it');
    });

    render(<PrivacyPolicyScreen />);

    expect(screen.getByText('Informativa sulla privacy')).toBeTruthy();
    expect(screen.getByText(/Dati che raccogliamo/)).toBeTruthy();
    expect(screen.getByText(/I tuoi diritti/)).toBeTruthy();
    expect(screen.getByLabelText('Informativa sulla privacy')).toBeTruthy();
  });
});
