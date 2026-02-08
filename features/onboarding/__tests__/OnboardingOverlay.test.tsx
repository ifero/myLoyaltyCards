import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import * as Linking from 'react-native/Libraries/Linking/Linking';

import OnboardingOverlay from '../OnboardingOverlay';

describe('OnboardingOverlay', () => {
  it('renders intro state with buttons and calls handlers', () => {
    const onRequestClose = jest.fn();
    const onAddManual = jest.fn();
    const onScan = jest.fn().mockResolvedValue(undefined);

    const { getByTestId, getByText } = render(
      <OnboardingOverlay
        visible
        onRequestClose={onRequestClose}
        onAddManual={onAddManual}
        onScan={onScan}
      />
    );

    expect(getByTestId('onboard-overlay')).toBeTruthy();
    expect(getByTestId('onboard-scan')).toBeTruthy();
    expect(getByTestId('onboard-add-manual')).toBeTruthy();

    fireEvent.press(getByTestId('onboard-add-manual'));
    expect(onAddManual).toHaveBeenCalled();
    expect(getByText('Nice! Your card is ready')).toBeTruthy();
  });

  it('shows success when onScan resolves and calls onComplete', async () => {
    const onRequestClose = jest.fn();
    const onScan = jest.fn().mockResolvedValue(undefined);
    const onComplete = jest.fn();

    const { getByTestId, getByText } = render(
      <OnboardingOverlay
        visible
        onRequestClose={onRequestClose}
        onAddManual={() => {}}
        onScan={onScan}
        onComplete={onComplete}
      />
    );

    fireEvent.press(getByTestId('onboard-scan'));

    await waitFor(() => expect(getByText('Nice! Your card is ready')).toBeTruthy());
    expect(onComplete).toHaveBeenCalled();
  });

  it('handles permission denied from onScan and shows Settings link', async () => {
    const onRequestClose = jest.fn();
    const permissionError = new Error('Permission denied') as Error & { name?: string };
    permissionError.name = 'PermissionDenied';
    const onScan = jest.fn().mockRejectedValue(permissionError);

    const openSettingsSpy = jest.fn();
    (Linking as unknown as { openSettings?: (...args: unknown[]) => unknown }).openSettings =
      openSettingsSpy;

    const { getByTestId, getByText } = render(
      <OnboardingOverlay
        visible
        onRequestClose={onRequestClose}
        onAddManual={() => {}}
        onScan={onScan}
      />
    );

    fireEvent.press(getByTestId('onboard-scan'));

    await waitFor(() => expect(getByText('Camera access required')).toBeTruthy());

    fireEvent.press(getByTestId('onboard-open-settings'));

    expect(openSettingsSpy).toHaveBeenCalled();

    openSettingsSpy.mockRestore();
  });

  it('skip calls onRequestClose and onComplete', () => {
    const onRequestClose = jest.fn();
    const onComplete = jest.fn();

    const { getByText } = render(
      <OnboardingOverlay
        visible
        onRequestClose={onRequestClose}
        onAddManual={() => {}}
        onScan={() => Promise.resolve()}
        onComplete={onComplete}
      />
    );

    fireEvent.press(getByText('Skip'));
    expect(onRequestClose).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalled();
  });
});
