import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text } from 'react-native';

import { useTheme } from '@/shared/theme';
import { TYPOGRAPHY } from '@/shared/theme/typography';

const LanguageListScreen = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.background,
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Text style={{ ...TYPOGRAPHY.bodyMd, color: theme.textSecondary }}>
        {t('settings.language.movedToSheet')}
      </Text>
    </View>
  );
};

export default LanguageListScreen;
