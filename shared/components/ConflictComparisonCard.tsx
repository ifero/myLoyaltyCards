/**
 * ConflictComparisonCard — side-by-side local/cloud data card for conflict modal
 * Story 13.8: Restyle Sync & Status Indicators (AC5, AC7)
 *
 * Displays a single side of the conflict comparison (local vs cloud).
 * Changed fields are highlighted with the accent colour AND a weight step — regular → semibold —
 * so a change is never signalled by colour alone (WCAG 1.4.1). One rule for the name and every
 * value. The barcode tail is the exception, colour-only: it is set in the one mono token (Story
 * 21.6 AC8), and JetBrains Mono ships a single weight.
 * Uses CardShell-like container styling with semantic tokens.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { SectionHeader } from '@/shared/components/ui/SectionHeader';
import { useTheme } from '@/shared/theme';
import { SYNC_TOKENS } from '@/shared/theme/sync-tokens';
import { TYPOGRAPHY } from '@/shared/theme/typography';
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
        <SectionHeader title={label} testID={`${testID}-label`} />
      </View>

      {/* Card name */}
      <Text
        testID={`${testID}-name`}
        style={{
          ...(isChangedField('name') ? TYPOGRAPHY.bodyMdStrong : TYPOGRAPHY.bodyMd),
          color: isChangedField('name') ? accentColor : valueColor,
          marginBottom: 4
        }}
        numberOfLines={1}
      >
        {data.name}
      </Text>

      {/* Points/Balance */}
      {data.points != null && (
        <View style={styles.fieldRow}>
          <Text
            testID={`${testID}-points-label`}
            style={{ ...TYPOGRAPHY.captionMd, color: labelColor }}
          >
            {`${t('syncUi.conflict.comparisonCard.pointsLabel')} `}
          </Text>
          <Text
            testID={`${testID}-points`}
            style={{
              ...(isChangedField('points') ? TYPOGRAPHY.labelBold : TYPOGRAPHY.captionMd),
              color: isChangedField('points') ? accentColor : valueColor
            }}
          >
            {data.points}
          </Text>
        </View>
      )}

      {/* Barcode tail */}
      <View style={styles.fieldRow}>
        <Text
          testID={`${testID}-barcode-label`}
          style={{ ...TYPOGRAPHY.captionMd, color: labelColor }}
        >
          {`${t('syncUi.conflict.comparisonCard.barcodeLabel')} `}
        </Text>
        <Text
          testID={`${testID}-barcode`}
          style={{
            ...TYPOGRAPHY.monoCode,
            color: isChangedField('barcodeTail') ? accentColor : valueColor
          }}
        >
          •••{data.barcodeTail}
        </Text>
      </View>

      {/* Updated at */}
      <Text
        testID={`${testID}-updated`}
        style={{
          ...TYPOGRAPHY.captionSm,
          color: labelColor,
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
    alignItems: 'center',
    gap: 12
  },
  // Wraps rather than overflowing: each card's content box is ~71pt wide in the side-by-side
  // modal, which holds the 16pt mono tail (7 glyphs × 9.6pt) on its own line but not beside
  // its label.
  fieldRow: {
    marginBottom: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center'
  }
});
