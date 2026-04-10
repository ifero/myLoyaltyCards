/**
 * ConflictComparisonCard — side-by-side local/cloud data card for conflict modal
 * Story 13.8: Restyle Sync & Status Indicators (AC5, AC7)
 *
 * Displays a single side of the conflict comparison (local vs cloud).
 * Changed fields are visually highlighted with accent color.
 * Uses CardShell-like container styling with semantic tokens.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { useTheme } from '@/shared/theme';
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
  const { theme, isDark } = useTheme();

  const cardBg = isDark ? '#2C2C2E' : '#F5F5F7';
  const accentColor = isDark ? '#FF453A' : '#FF5B30';
  const labelColor = theme.textSecondary;
  const valueColor = theme.textPrimary;

  const isChangedField = (field: string): boolean => data.changedFields.includes(field);

  return (
    <View
      testID={testID}
      accessibilityLabel={`${label}: ${data.name}, barcode ending ${data.barcodeTail}, updated ${data.updatedAt}`}
      className="flex-1 rounded-xl p-3"
      style={{ backgroundColor: cardBg }}
    >
      {/* Header: icon + label */}
      <View className="mb-2 flex-row items-center">
        <MaterialIcons testID={`${testID}-icon`} name={icon} size={16} color={theme.primary} />
        <Text
          testID={`${testID}-label`}
          className="ml-1.5"
          style={{
            color: labelColor,
            fontSize: 11,
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: 0.5
          }}
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
        <View className="mb-1 flex-row items-center">
          <Text testID={`${testID}-points-label`} style={{ color: labelColor, fontSize: 11 }}>
            Points:{' '}
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
      <View className="mb-1 flex-row items-center">
        <Text testID={`${testID}-barcode-label`} style={{ color: labelColor, fontSize: 11 }}>
          Barcode:{' '}
        </Text>
        <Text
          testID={`${testID}-barcode`}
          style={{
            color: isChangedField('barcodeTail') ? accentColor : valueColor,
            fontSize: 12,
            fontWeight: isChangedField('barcodeTail') ? '700' : '500',
            fontFamily: 'monospace'
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
        Updated: {data.updatedAt}
      </Text>
    </View>
  );
};
