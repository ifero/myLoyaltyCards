import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ExportConfirmationSheet } from './ExportConfirmationSheet';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: { primary: '#1A73E8', textPrimary: '#111', textSecondary: '#777', error: '#DC2626' }
  })
}));

jest.mock('@/shared/components/ui', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');

  return {
    BottomSheet: ({ visible, children }: { visible: boolean; children: ReactNode }) =>
      visible ? <View>{children}</View> : null,
    Button: ({
      testID,
      onPress,
      children
    }: {
      testID?: string;
      onPress: () => void;
      children: ReactNode;
    }) => (
      <Pressable testID={testID} onPress={onPress}>
        <Text>{children}</Text>
      </Pressable>
    )
  };
});

describe('ExportConfirmationSheet', () => {
  it('fires export and close handlers', () => {
    const onExport = jest.fn();
    const onClose = jest.fn();

    const { getByTestId } = render(
      <ExportConfirmationSheet
        visible
        cardCount={3}
        isExporting={false}
        exportError={null}
        onExport={onExport}
        onClose={onClose}
      />
    );

    fireEvent.press(getByTestId('export-confirm-button'));
    fireEvent.press(getByTestId('export-cancel-button'));

    expect(onExport).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
