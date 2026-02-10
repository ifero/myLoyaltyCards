/**
 * Help Screen Tests
 * Story 4.3: Help & FAQ Access
 */

import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';

import docsHelpItems from '../../docs/help.json';
import bundledHelpItems from '../../features/help/help-data.json';
import HelpScreen from '../help';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      background: '#FAFAFA',
      surface: '#FFFFFF',
      textPrimary: '#1F2937',
      textSecondary: '#6B7280',
      primary: '#73A973',
      primaryDark: '#5C9A5C',
      border: '#E5E7EB'
    },
    isDark: false
  })
}));

describe('HelpScreen — Story 4.3', () => {
  it('renders the Help & FAQ title', () => {
    const { getByText } = render(<HelpScreen />);
    expect(getByText('Help & FAQ')).toBeTruthy();
  });

  it('filters FAQs by search query', () => {
    const { getByTestId, queryByText } = render(<HelpScreen />);

    const search = getByTestId('help-search');
    fireEvent.changeText(search, 'privacy');

    expect(queryByText('Is my data private?')).toBeTruthy();
    expect(queryByText('How do I add my first card?')).toBeNull();
  });

  it('toggles FAQ answer visibility on question press', () => {
    const { getByText, queryByText } = render(<HelpScreen />);

    expect(queryByText(/Tap Add Card on the main screen/)).toBeNull();

    fireEvent.press(getByText('How do I add my first card?'));
    expect(getByText(/Tap Add Card on the main screen/)).toBeTruthy();

    fireEvent.press(getByText('How do I add my first card?'));
    expect(queryByText(/Tap Add Card on the main screen/)).toBeNull();
  });

  it('renders step list when expanded', () => {
    const { getByText } = render(<HelpScreen />);

    fireEvent.press(getByText('How do I add my first card?'));
    expect(getByText('• Open the main screen')).toBeTruthy();
  });

  it('renders fallback steps when override is empty', () => {
    const { getByText } = render(<HelpScreen itemsOverride={[]} />);

    fireEvent.press(getByText('How do I add a card?'));
    expect(getByText('• Open the main screen')).toBeTruthy();
  });

  it('keeps bundled help data in sync with docs source-of-truth', () => {
    expect(bundledHelpItems).toEqual(docsHelpItems);
  });

  it('falls back to bundled FAQ items when provided list is empty', () => {
    const { getByText } = render(<HelpScreen itemsOverride={[]} />);

    expect(getByText('How do I add a card?')).toBeTruthy();
  });

  it('shows an alert when external links are not supported', async () => {
    const canOpenUrlSpy = jest.spyOn(Linking, 'canOpenURL').mockImplementation(async () => false);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

    const { getByTestId } = render(<HelpScreen />);

    fireEvent.press(getByTestId('help-contact-support'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    canOpenUrlSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it('opens Contact Support and Submit Feedback actions', async () => {
    const canOpenUrlSpy = jest.spyOn(Linking, 'canOpenURL').mockImplementation(async () => true);
    const openUrlSpy = jest.spyOn(Linking, 'openURL').mockImplementation(jest.fn());
    const { getByTestId } = render(<HelpScreen />);

    fireEvent.press(getByTestId('help-contact-support'));
    await waitFor(() => {
      expect(openUrlSpy).toHaveBeenCalledWith('mailto:support@myloyaltycards.app');
    });

    fireEvent.press(getByTestId('help-submit-feedback'));
    await waitFor(() => {
      expect(openUrlSpy).toHaveBeenCalledWith('https://myloyaltycards.app/feedback');
    });

    openUrlSpy.mockRestore();
    canOpenUrlSpy.mockRestore();
  });
});
