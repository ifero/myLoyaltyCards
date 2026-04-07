import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { ErrorBanner } from '../ErrorBanner';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      error: '#FF3B30'
    },
    typography: {
      footnote: { fontSize: 13, lineHeight: 18 }
    },
    spacing: { sm: 8, md: 16 }
  })
}));

describe('ErrorBanner', () => {
  it('renders icon and message when error exists', () => {
    render(<ErrorBanner message="Something went wrong" />);

    expect(screen.getByTestId('auth-error-banner')).toBeTruthy();
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('has accessibility live region polite', () => {
    render(<ErrorBanner message="Invalid credentials" />);

    expect(screen.getByTestId('auth-error-banner').props.accessibilityLiveRegion).toBe('polite');
  });

  it('does not render when message is null', () => {
    render(<ErrorBanner message={null} />);

    expect(screen.queryByTestId('auth-error-banner')).toBeNull();
  });
});
