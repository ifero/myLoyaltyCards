import { render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { HighlightSlide } from './HighlightSlide';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      textPrimary: '#1F1F24',
      textSecondary: '#66666B',
      primary: '#1A73E8',
      primaryDark: '#1967D2',
      border: '#E5E5EB'
    },
    typography: {
      title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' }
    }
  })
}));

describe('HighlightSlide', () => {
  it('renders title and illustration', () => {
    const { getByText } = render(
      <HighlightSlide
        title="All your cards in one place"
        description="Description"
        illustration={<Text>Illustration</Text>}
      />
    );

    expect(getByText('All your cards in one place')).toBeTruthy();
    expect(getByText('Illustration')).toBeTruthy();
  });

  it('renders description copy', () => {
    const { getByText } = render(
      <HighlightSlide
        title="t"
        description="Store every loyalty card digitally."
        illustration={<Text>I</Text>}
        testID="highlight-slide"
      />
    );

    expect(getByText('Store every loyalty card digitally.')).toBeTruthy();
  });

  it('does not render CTA button (handled by screen footer)', () => {
    const { queryByTestId } = render(
      <HighlightSlide title="t" description="d" illustration={<Text>I</Text>} />
    );

    expect(queryByTestId('highlight-next-button')).toBeNull();
  });
});
