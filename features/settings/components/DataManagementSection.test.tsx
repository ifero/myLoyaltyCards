import { fireEvent, render } from '@testing-library/react-native';

import { DataManagementSection } from './DataManagementSection';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: { textTertiary: '#999' }
  })
}));

jest.mock('@/shared/components/ui', () => {
  const { Pressable, Text } = jest.requireActual('react-native');

  return {
    ActionRow: ({
      testID,
      label,
      value,
      onPress
    }: {
      testID?: string;
      label: string;
      value?: string;
      onPress: () => void;
    }) => (
      <Pressable testID={testID} onPress={onPress}>
        <Text>{label}</Text>
        <Text>{value}</Text>
      </Pressable>
    )
  };
});

describe('DataManagementSection', () => {
  it('renders sync row only when authenticated and fires handlers', () => {
    const onExportPress = jest.fn();
    const onImportPress = jest.fn();
    const onSyncPress = jest.fn();

    const { getByTestId, rerender, queryByTestId } = render(
      <DataManagementSection
        isAuthenticated={false}
        syncLabel="Never"
        isSyncing={false}
        onExportPress={onExportPress}
        onImportPress={onImportPress}
        onSyncPress={onSyncPress}
      />
    );

    expect(queryByTestId('settings-sync-row')).toBeNull();
    fireEvent.press(getByTestId('settings-export-row'));
    fireEvent.press(getByTestId('settings-import-row'));
    expect(onExportPress).toHaveBeenCalledTimes(1);
    expect(onImportPress).toHaveBeenCalledTimes(1);

    rerender(
      <DataManagementSection
        isAuthenticated
        syncLabel="just now"
        isSyncing={false}
        onExportPress={onExportPress}
        onImportPress={onImportPress}
        onSyncPress={onSyncPress}
      />
    );

    fireEvent.press(getByTestId('settings-sync-row'));
    expect(onSyncPress).toHaveBeenCalledTimes(1);
  });
});
