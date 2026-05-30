/**
 * DataSummaryScreen
 * Story 6-11: Privacy & Consent
 *
 * Read-only informational screen showing what data the app collects.
 * Only accessible to authenticated users from Settings → Data & Privacy.
 * Redirects unauthenticated visitors to /sign-in.
 *
 * ⚠️ "Download My Data" is a placeholder — actual export lives in Epic 8.
 */

import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { useAuthState } from '@/shared/supabase/useAuthState';
import { useTheme } from '@/shared/theme';

// ---------------------------------------------------------------------------
// Data table
// ---------------------------------------------------------------------------

type DataRow = {
  id: string;
  categoryKey: string;
  detailKey: string;
  collected: boolean;
};

const DATA_ROWS: DataRow[] = [
  {
    id: 'account',
    categoryKey: 'privacy.dataSummary.rows.account.category',
    detailKey: 'privacy.dataSummary.rows.account.detail',
    collected: true
  },
  {
    id: 'cards',
    categoryKey: 'privacy.dataSummary.rows.cards.category',
    detailKey: 'privacy.dataSummary.rows.cards.detail',
    collected: true
  },
  {
    id: 'app',
    categoryKey: 'privacy.dataSummary.rows.app.category',
    detailKey: 'privacy.dataSummary.rows.app.detail',
    collected: true
  },
  {
    id: 'location',
    categoryKey: 'privacy.dataSummary.rows.location.category',
    detailKey: 'privacy.dataSummary.rows.location.detail',
    collected: false
  },
  {
    id: 'contacts',
    categoryKey: 'privacy.dataSummary.rows.contacts.category',
    detailKey: 'privacy.dataSummary.rows.contacts.detail',
    collected: false
  },
  {
    id: 'deviceId',
    categoryKey: 'privacy.dataSummary.rows.deviceId.category',
    detailKey: 'privacy.dataSummary.rows.deviceId.detail',
    collected: false
  }
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DataSummaryScreen = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { authState } = useAuthState();
  const router = useRouter();

  useEffect(() => {
    if (authState === 'guest') {
      router.replace('/sign-in');
    }
  }, [authState, router]);

  if (authState === 'loading' || authState === 'guest') {
    return (
      <View
        testID="data-summary-loading"
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.background
        }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      testID="data-summary-screen"
      className="flex-1 px-6 pb-8 pt-6"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      accessibilityLabel={t('privacy.dataSummary.title')}
    >
      {/* Title */}
      <Text
        testID="data-summary-title"
        accessibilityRole="header"
        className="mb-2 text-2xl font-bold"
        style={{ color: theme.textPrimary }}
      >
        {t('privacy.dataSummary.title')}
      </Text>
      <Text className="mb-6 text-sm leading-5" style={{ color: theme.textSecondary }}>
        {t('privacy.dataSummary.description')}
      </Text>

      {/* Data table */}
      <View
        testID="data-summary-table"
        className="mb-6 overflow-hidden rounded-xl"
        style={{ backgroundColor: theme.surface }}
      >
        {/* Header row */}
        <View className="flex-row border-b px-4 py-3" style={{ borderColor: theme.border }}>
          <Text className="flex-1 text-sm font-semibold" style={{ color: theme.textPrimary }}>
            {t('privacy.dataSummary.table.categoryHeader')}
          </Text>
          <Text className="flex-[2] text-sm font-semibold" style={{ color: theme.textPrimary }}>
            {t('privacy.dataSummary.table.dataCollectedHeader')}
          </Text>
        </View>

        {/* Data rows */}
        {DATA_ROWS.map((row, idx) => (
          <View
            key={row.id}
            testID={`data-row-${row.id.toLowerCase().replace(/\s/g, '-')}`}
            className={`flex-row px-4 py-3 ${idx < DATA_ROWS.length - 1 ? 'border-b' : ''}`}
            style={{ borderColor: theme.border }}
          >
            <Text
              className="flex-1 text-sm"
              style={{ color: row.collected ? theme.textPrimary : theme.textSecondary }}
            >
              {t(row.categoryKey)}
            </Text>
            <Text
              className="flex-[2] text-sm"
              style={{ color: row.collected ? theme.textPrimary : theme.textSecondary }}
            >
              {t(row.detailKey)}
            </Text>
          </View>
        ))}
      </View>

      {/* Download My Data placeholder */}
      <Pressable
        testID="download-data-placeholder"
        accessibilityRole="button"
        accessibilityLabel={t('privacy.dataSummary.downloadButtonA11yLabel')}
        accessibilityHint={t('privacy.dataSummary.downloadButtonA11yHint')}
        disabled
        className="mb-4 items-center justify-center rounded-xl"
        style={{
          backgroundColor: theme.border,
          height: 48,
          opacity: 0.5
        }}
      >
        <Text className="text-sm font-semibold" style={{ color: theme.textSecondary }}>
          {t('privacy.dataSummary.downloadButton')}
        </Text>
      </Pressable>

      <Text className="text-center text-xs" style={{ color: theme.textSecondary }}>
        {t('privacy.dataSummary.downloadFooter')}
      </Text>
    </ScrollView>
  );
};

export default DataSummaryScreen;
