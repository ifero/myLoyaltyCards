/**
 * DataSummaryScreen — Unit Tests
 * Story 6-11: Privacy & Consent
 */

import { render, screen } from '@testing-library/react-native';
import React from 'react';

import DataSummaryScreen from '../DataSummaryScreen';

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

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace })
}));

const mockUseAuthState = jest.fn();
jest.mock('@/shared/supabase/useAuthState', () => ({
  useAuthState: () => mockUseAuthState()
}));

// ---------------------------------------------------------------------------
// Tests — Authenticated
// ---------------------------------------------------------------------------

describe('DataSummaryScreen — authenticated user', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthState.mockReturnValue({ authState: 'authenticated', isAuthenticated: true });
  });

  it('renders the screen container', () => {
    render(<DataSummaryScreen />);
    expect(screen.getByTestId('data-summary-screen')).toBeTruthy();
  });

  it('displays the title "What We Collect"', () => {
    render(<DataSummaryScreen />);
    expect(screen.getByTestId('data-summary-title')).toBeTruthy();
    expect(screen.getByText('What We Collect')).toBeTruthy();
  });

  it('renders the data table', () => {
    render(<DataSummaryScreen />);
    expect(screen.getByTestId('data-summary-table')).toBeTruthy();
  });

  it('shows collected data categories', () => {
    render(<DataSummaryScreen />);
    expect(screen.getByText('Account')).toBeTruthy();
    expect(screen.getByText('Email address')).toBeTruthy();
    expect(screen.getByText('Cards')).toBeTruthy();
    expect(screen.getByText('Card names, barcodes, timestamps')).toBeTruthy();
    expect(screen.getByText('App')).toBeTruthy();
    expect(screen.getByText('App version, locale (for catalogue)')).toBeTruthy();
  });

  it('shows not-collected data categories', () => {
    render(<DataSummaryScreen />);
    expect(screen.getByText('Location')).toBeTruthy();
    expect(screen.getByText('Contacts')).toBeTruthy();
    expect(screen.getByText('Device ID')).toBeTruthy();
  });

  it('renders data rows with testIDs', () => {
    render(<DataSummaryScreen />);
    expect(screen.getByTestId('data-row-account')).toBeTruthy();
    expect(screen.getByTestId('data-row-cards')).toBeTruthy();
    expect(screen.getByTestId('data-row-app')).toBeTruthy();
    expect(screen.getByTestId('data-row-location')).toBeTruthy();
    expect(screen.getByTestId('data-row-contacts')).toBeTruthy();
    expect(screen.getByTestId('data-row-device-id')).toBeTruthy();
  });

  it('renders column headers', () => {
    render(<DataSummaryScreen />);
    expect(screen.getByText('Category')).toBeTruthy();
    expect(screen.getByText('Data Collected')).toBeTruthy();
  });

  it('renders the Download My Data placeholder (disabled)', () => {
    render(<DataSummaryScreen />);
    const button = screen.getByTestId('download-data-placeholder');
    expect(button).toBeTruthy();
    expect(screen.getByText('Download My Data (coming soon)')).toBeTruthy();
  });

  it('shows coming-soon hint text', () => {
    render(<DataSummaryScreen />);
    expect(screen.getByText('Data export will be available in a future update.')).toBeTruthy();
  });

  it('has proper accessibility label on screen', () => {
    render(<DataSummaryScreen />);
    expect(screen.getByLabelText('What We Collect')).toBeTruthy();
  });

  it('has proper accessibility on Download My Data placeholder', () => {
    render(<DataSummaryScreen />);
    expect(screen.getByLabelText('Download My Data')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Tests — Auth guard
// ---------------------------------------------------------------------------

describe('DataSummaryScreen — guest user (auth guard)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthState.mockReturnValue({ authState: 'guest', isAuthenticated: false });
  });

  it('shows loading indicator and does not render screen content', () => {
    render(<DataSummaryScreen />);
    expect(screen.getByTestId('data-summary-loading')).toBeTruthy();
    expect(screen.queryByTestId('data-summary-screen')).toBeNull();
  });

  it('redirects to /sign-in', () => {
    render(<DataSummaryScreen />);
    expect(mockReplace).toHaveBeenCalledWith('/sign-in');
  });
});

describe('DataSummaryScreen — loading state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthState.mockReturnValue({ authState: 'loading', isAuthenticated: false });
  });

  it('shows loading indicator while auth state is resolving', () => {
    render(<DataSummaryScreen />);
    expect(screen.getByTestId('data-summary-loading')).toBeTruthy();
    expect(screen.queryByTestId('data-summary-screen')).toBeNull();
  });

  it('does not redirect while loading', () => {
    render(<DataSummaryScreen />);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
