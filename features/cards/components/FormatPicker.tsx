/**
 * Format Picker Component
 * Story 2.2: Add Card Manually - AC5
 *
 * Barcode format selection component using Picker.
 */

import { Picker } from '@react-native-picker/picker';
import { useTranslation } from 'react-i18next';
import { View, Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { BarcodeFormat, barcodeFormatSchema } from '@/core/schemas';

interface FormatPickerProps {
  value: BarcodeFormat;
  onChange: (format: BarcodeFormat) => void;
  testID?: string;
}

/**
 * Get all barcode format options from schema
 */
const FORMAT_OPTIONS = barcodeFormatSchema.options;

/**
 * FormatPicker - Barcode format selection
 *
 * Per AC5:
 * - Options: Code 128 (default), EAN-13, EAN-8, QR Code, Code 39, UPC-A
 * - Default selection is "Code 128"
 */
export const FormatPicker = ({ value, onChange, testID }: FormatPickerProps) => {
  const { t } = useTranslation();
  const formatLabels: Record<BarcodeFormat, string> = {
    CODE128: t('addCard.multiCode.formats.CODE128'),
    EAN13: t('addCard.multiCode.formats.EAN13'),
    EAN8: t('addCard.multiCode.formats.EAN8'),
    QR: t('addCard.multiCode.formats.QR'),
    CODE39: t('addCard.multiCode.formats.CODE39'),
    UPCA: t('addCard.multiCode.formats.UPCA')
  };

  return (
    <View testID={testID}>
      <Text style={styles.label}>{t('cards.formatPicker.label')}</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={value}
          onValueChange={(itemValue) => onChange(itemValue as BarcodeFormat)}
          accessibilityLabel={t('cards.formatPicker.accessibilityLabel')}
          testID="format-picker"
        >
          {FORMAT_OPTIONS.map((format) => (
            <Picker.Item key={format} label={formatLabels[format]} value={format} />
          ))}
        </Picker>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    marginBottom: 8,
    fontSize: 12,
    lineHeight: 16,
    color: '#6B7280'
  },
  pickerWrapper: {
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB'
  }
});
