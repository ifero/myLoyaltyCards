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
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { useAuthState } from '@/shared/supabase/useAuthState';
import { useTheme } from '@/shared/theme';

// ---------------------------------------------------------------------------
// Data table
// ---------------------------------------------------------------------------

type DataRow = {
  category: string;
  detail: string;
  collected: boolean;
};

const DATA_ROWS: DataRow[] = [
  { category: 'Account', detail: 'Email address', collected: true },
  { category: 'Cards', detail: 'Card names, barcodes, timestamps', collected: true },
  { category: 'App', detail: 'App version, locale (for catalogue)', collected: true },
  { category: 'Location', detail: 'Not collected', collected: false },
  { category: 'Contacts', detail: 'Not collected', collected: false },
  { category: 'Device ID', detail: 'Not collected', collected: false }
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DataSummaryScreen = () => {
  const { theme } = useTheme();
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
      accessibilityLabel="What We Collect"
    >
      {/* Title */}
      <Text
        testID="data-summary-title"
        accessibilityRole="header"
        className="mb-2 text-2xl font-bold"
        style={{ color: theme.textPrimary }}
      >
        What We Collect
      </Text>
      <Text className="mb-6 text-sm leading-5" style={{ color: theme.textSecondary }}>
        This is a summary of the data myLoyaltyCards collects when you have an account. Guest users
        have no cloud data — everything stays on device.
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
            Category
          </Text>
          <Text className="flex-[2] text-sm font-semibold" style={{ color: theme.textPrimary }}>
            Data Collected
          </Text>
        </View>

        {/* Data rows */}
        {DATA_ROWS.map((row, idx) => (
          <View
            key={row.category}
            testID={`data-row-${row.category.toLowerCase().replace(/\s/g, '-')}`}
            className={`flex-row px-4 py-3 ${idx < DATA_ROWS.length - 1 ? 'border-b' : ''}`}
            style={{ borderColor: theme.border }}
          >
            <Text
              className="flex-1 text-sm"
              style={{ color: row.collected ? theme.textPrimary : theme.textSecondary }}
            >
              {row.category}
            </Text>
            <Text
              className="flex-[2] text-sm"
              style={{ color: row.collected ? theme.textPrimary : theme.textSecondary }}
            >
              {row.detail}
            </Text>
          </View>
        ))}
      </View>

      {/* Download My Data placeholder */}
      <Pressable
        testID="download-data-placeholder"
        accessibilityRole="button"
        accessibilityLabel="Download My Data"
        accessibilityHint="This feature is not yet available"
        disabled
        className="mb-4 items-center justify-center rounded-xl"
        style={{
          backgroundColor: theme.border,
          height: 48,
          opacity: 0.5
        }}
      >
        <Text className="text-sm font-semibold" style={{ color: theme.textSecondary }}>
          Download My Data (coming soon)
        </Text>
      </Pressable>

      <Text className="text-center text-xs" style={{ color: theme.textSecondary }}>
        Data export will be available in a future update.
      </Text>
    </ScrollView>
  );
};

export default DataSummaryScreen;
