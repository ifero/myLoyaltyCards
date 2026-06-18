/**
 * ConflictComparisonCard — side-by-side local/cloud data card for conflict modal
 * Story 13.8: Restyle Sync & Status Indicators (AC5, AC7)
 *
 * Displays a single side of the conflict comparison (local vs cloud).
 * Changed fields are visually highlighted with accent color.
 * Uses CardShell-like container styling with semantic tokens.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Platform, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useTheme } from '@/shared/theme';
import { SYNC_TOKENS } from '@/shared/theme/sync-tokens';
import type { ConflictCardData } from '@/shared/types/sync-ui';

type ConflictComparisonCardProps = {
  label: string; // "This device" | "Cloud"
  icon: 'smartphone' | 'cloud';
  data: ConflictCardData;
  testID?: string;
};

export const ConflictComparisonCard = ({
  label,
  icon,
  data,
  testID
}: ConflictComparisonCardProps) => {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();

  const mode = isDark ? 'dark' : 'light';
  const cardBg = SYNC_TOKENS.conflictCardBg[mode];
  const accentColor = SYNC_TOKENS.conflictAccent[mode];
  const labelColor = theme.textSecondary;
  const valueColor = theme.textPrimary;

  const isChangedField = (field: string): boolean => data.changedFields.includes(field);

  return (
    <View
      testID={testID}
      accessibilityLabel={t('syncUi.conflict.comparisonCard.a11yLabel', {
        label,
        name: data.name,
        barcodeTail: data.barcodeTail,
        updatedAt: data.updatedAt
      })}
      style={[styles.card, { backgroundColor: cardBg }]}
    >
      {/* Header: icon + label */}
      <View style={styles.header}>
        <MaterialIcons testID={`${testID}-icon`} name={icon} size={16} color={theme.primary} />
        <Text
          testID={`${testID}-label`}
          style={[
            styles.headerLabel,
            {
              color: labelColor
            }
          ]}
        >
          {label}
        </Text>
      </View>

      {/* Card name */}
      <Text
        testID={`${testID}-name`}
        style={{
          color: isChangedField('name') ? accentColor : valueColor,
          fontSize: 14,
          fontWeight: isChangedField('name') ? '700' : '600',
          marginBottom: 4
        }}
        numberOfLines={1}
      >
        {data.name}
      </Text>

      {/* Points/Balance */}
      {data.points != null && (
        <View style={styles.fieldRow}>
          <Text testID={`${testID}-points-label`} style={{ color: labelColor, fontSize: 11 }}>
            {`${t('syncUi.conflict.comparisonCard.pointsLabel')} `}
          </Text>
          <Text
            testID={`${testID}-points`}
            style={{
              color: isChangedField('points') ? accentColor : valueColor,
              fontSize: 12,
              fontWeight: isChangedField('points') ? '700' : '500'
            }}
          >
            {data.points}
          </Text>
        </View>
      )}

      {/* Barcode tail */}
      <View style={styles.fieldRow}>
        <Text testID={`${testID}-barcode-label`} style={{ color: labelColor, fontSize: 11 }}>
          {`${t('syncUi.conflict.comparisonCard.barcodeLabel')} `}
        </Text>
        <Text
          testID={`${testID}-barcode`}
          style={{
            color: isChangedField('barcodeTail') ? accentColor : valueColor,
            fontSize: 12,
            fontWeight: isChangedField('barcodeTail') ? '700' : '500',
            fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' })
          }}
        >
          •••{data.barcodeTail}
        </Text>
      </View>

      {/* Updated at */}
      <Text
        testID={`${testID}-updated`}
        style={{
          color: labelColor,
          fontSize: 10,
          marginTop: 4
        }}
      >
        {t('syncUi.conflict.comparisonCard.updatedPrefix')} {data.updatedAt}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 24
  },
  header: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerLabel: {
    marginLeft: 12,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  fieldRow: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center'
  }
});
