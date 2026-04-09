import { render } from '@testing-library/react-native';
import React, { type ReactNode } from 'react';

import { ImportPreviewSheet } from './ImportPreviewSheet';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      primary: '#1A73E8',
      textPrimary: '#111111',
      textSecondary: '#777777',
      surfaceElevated: '#F5F5F5'
    }
  })
}));

jest.mock('@/shared/components/ui', () => ({
  BottomSheet: ({ visible, children }: { visible: boolean; children: ReactNode }) =>
    visible ? <>{children}</> : null,
  Button: ({ children }: { children: ReactNode }) => <>{children}</>
}));

describe('ImportPreviewSheet', () => {
  it('renders preview information', () => {
    const { getByText } = render(
      <ImportPreviewSheet
        visible
        fileName="my-cards-backup.json"
        totalCards={8}
        newCardsCount={5}
        duplicateCount={3}
        invalidCount={1}
        isImporting={false}
        onImport={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(getByText('my-cards-backup.json')).toBeTruthy();
    expect(getByText('8 cards found')).toBeTruthy();
    expect(getByText('5 new cards will be added.')).toBeTruthy();
    expect(getByText('3 duplicates will be skipped.')).toBeTruthy();
    expect(getByText('1 invalid entry will be skipped.')).toBeTruthy();
  });
});
