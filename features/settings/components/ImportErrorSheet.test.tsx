import { render } from '@testing-library/react-native';
import React, { type ReactNode } from 'react';

import { ImportErrorSheet } from './ImportErrorSheet';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      warning: '#D97706',
      info: '#1A73E8',
      primary: '#1A73E8',
      textPrimary: '#111111'
    }
  })
}));

jest.mock('@/shared/components/ui', () => ({
  BottomSheet: ({ visible, children }: { visible: boolean; children: ReactNode }) =>
    visible ? <>{children}</> : null,
  Button: ({ children }: { children: ReactNode }) => <>{children}</>
}));

describe('ImportErrorSheet', () => {
  it('renders invalid file message', () => {
    const { getByText } = render(
      <ImportErrorSheet
        visible
        variant="invalid"
        title="Invalid File"
        message="This file doesn't contain valid card data. Please select a different file."
        onClose={jest.fn()}
      />
    );

    expect(getByText('Invalid File')).toBeTruthy();
    expect(
      getByText("This file doesn't contain valid card data. Please select a different file.")
    ).toBeTruthy();
  });

  it('renders empty file message', () => {
    const { getByText } = render(
      <ImportErrorSheet
        visible
        variant="empty"
        title="No Card Data"
        message="This file contains no card data."
        onClose={jest.fn()}
      />
    );

    expect(getByText('No Card Data')).toBeTruthy();
    expect(getByText('This file contains no card data.')).toBeTruthy();
  });
});
