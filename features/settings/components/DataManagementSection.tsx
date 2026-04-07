import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import React from 'react';

import { ActionRow } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme';

import { SettingsSection } from './SettingsSection';

type DataManagementSectionProps = {
  isAuthenticated: boolean;
  syncLabel: string;
  isSyncing: boolean;
  onExportPress: () => void;
  onImportPress: () => void;
  onSyncPress: () => void;
};

export const DataManagementSection = ({
  isAuthenticated,
  syncLabel,
  isSyncing,
  onExportPress,
  onImportPress,
  onSyncPress
}: DataManagementSectionProps) => {
  const { theme } = useTheme();

  return (
    <SettingsSection title="Data">
      <ActionRow
        testID="settings-export-row"
        variant="plain"
        noPaddingHorizontal
        prefix={<MaterialIcons name="file-download" size={24} color={theme.primary} />}
        label="Export Data"
        value="JSON"
        onPress={onExportPress}
      />
      <ActionRow
        testID="settings-import-row"
        variant="plain"
        noPaddingHorizontal
        prefix={<MaterialIcons name="file-upload" size={24} color={theme.primary} />}
        label="Import Data"
        value="JSON"
        onPress={onImportPress}
      />
      {isAuthenticated ? (
        <ActionRow
          testID="settings-sync-row"
          variant="plain"
          noPaddingHorizontal
          prefix={
            <MaterialCommunityIcons name="cloud-sync-outline" size={24} color={theme.primary} />
          }
          label="Sync"
          value={syncLabel}
          showChevron={false}
          isLoading={isSyncing}
          onPress={onSyncPress}
        />
      ) : null}
    </SettingsSection>
  );
};
