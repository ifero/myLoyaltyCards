/**
 * Legacy Scan Route Tests
 *
 * Verifies `/scan` redirects to the new Story 13.4 scanner route.
 * Story 16.9 (AD-4): the route now redirects declaratively via `<Redirect>`
 * instead of an effect-driven `router.replace`, so these tests assert the
 * `href` passed to `<Redirect>` rather than a router call.
 */

import { render } from '@testing-library/react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';

import ScanScreen from '@/app/scan';

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
  useLocalSearchParams: jest.fn()
}));

const redirectHref = () => (Redirect as unknown as jest.Mock).mock.calls[0][0].href;

describe('ScanScreen legacy bridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to /add-card/scan preserving brand params', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      brandId: 'esselunga',
      brandName: 'Esselunga',
      brandColor: '#E30613',
      brandFormat: 'EAN13'
    });

    render(<ScanScreen />);

    expect(redirectHref()).toEqual({
      pathname: '/add-card/scan',
      params: {
        brandId: 'esselunga',
        brandName: 'Esselunga',
        brandColor: '#E30613',
        brandFormat: 'EAN13'
      }
    });
  });

  it('redirects to /add-card/scan with empty params when no brand context', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});

    render(<ScanScreen />);

    expect(redirectHref()).toEqual({
      pathname: '/add-card/scan',
      params: {}
    });
  });
});
