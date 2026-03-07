/**
 * ConsentCheckbox — Unit Tests
 * Story 6-4: Privacy Policy & Consent Flow
 */

import { render, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import ConsentCheckbox from '../ConsentCheckbox';

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

// Mock router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush })
}));

describe('ConsentCheckbox', () => {
  const defaultProps = {
    checked: false,
    onToggle: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the checkbox container', () => {
    render(<ConsentCheckbox {...defaultProps} />);
    expect(screen.getByTestId('consent-checkbox')).toBeTruthy();
  });

  it('displays the consent label text', () => {
    render(<ConsentCheckbox {...defaultProps} />);
    expect(screen.getByText(/I agree to the/)).toBeTruthy();
  });

  it('displays the Privacy Policy link', () => {
    render(<ConsentCheckbox {...defaultProps} />);
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
  });

  it('renders unchecked state correctly', () => {
    render(<ConsentCheckbox {...defaultProps} checked={false} />);
    const checkbox = screen.getByTestId('consent-checkbox-toggle');
    expect(checkbox).toBeTruthy();
  });

  it('renders checked state correctly', () => {
    render(<ConsentCheckbox {...defaultProps} checked={true} />);
    const checkbox = screen.getByTestId('consent-checkbox-toggle');
    expect(checkbox).toBeTruthy();
  });

  it('calls onToggle with opposite value when pressed', () => {
    const onToggle = jest.fn();
    render(<ConsentCheckbox checked={false} onToggle={onToggle} />);
    fireEvent.press(screen.getByTestId('consent-checkbox-toggle'));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('calls onToggle with false when unchecking', () => {
    const onToggle = jest.fn();
    render(<ConsentCheckbox checked={true} onToggle={onToggle} />);
    fireEvent.press(screen.getByTestId('consent-checkbox-toggle'));
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('navigates to privacy policy when link is pressed', () => {
    render(<ConsentCheckbox {...defaultProps} />);
    fireEvent.press(screen.getByTestId('consent-policy-link'));
    expect(mockPush).toHaveBeenCalledWith('/privacy-policy');
  });

  it('has proper accessibility label', () => {
    render(<ConsentCheckbox {...defaultProps} />);
    expect(screen.getByLabelText('I agree to the Privacy Policy')).toBeTruthy();
  });

  it('indicates checked state to accessibility', () => {
    const { rerender } = render(<ConsentCheckbox {...defaultProps} checked={false} />);
    const toggleUnchecked = screen.getByTestId('consent-checkbox-toggle');
    expect(toggleUnchecked.props.accessibilityState?.checked).toBe(false);

    rerender(<ConsentCheckbox {...defaultProps} checked={true} />);
    const toggleChecked = screen.getByTestId('consent-checkbox-toggle');
    expect(toggleChecked.props.accessibilityState?.checked).toBe(true);
  });
});
