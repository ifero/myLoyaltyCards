/**
 * Format Picker Component
 * Story 2.2: Add Card Manually - AC5
 *
 * Barcode format selection component using Picker.
 */

import { Picker } from '@react-native-picker/picker';
import { View, Text } from 'react-native';

import { BarcodeFormat, barcodeFormatSchema } from '@/core/schemas';

interface FormatPickerProps {
  value: BarcodeFormat;
  onChange: (format: BarcodeFormat) => void;
  testID?: string;
}

/**
 * Format display names for UI
 */
const FORMAT_LABELS: Record<BarcodeFormat, string> = {
  CODE128: 'Code 128',
  EAN13: 'EAN-13',
  EAN8: 'EAN-8',
  QR: 'QR Code',
  CODE39: 'Code 39',
  UPCA: 'UPC-A'
};

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
  return (
    <View testID={testID}>
      <Text className="mb-1 text-xs text-gray-500">Barcode Format</Text>
      <View className="overflow-hidden rounded-lg border border-gray-300">
        <Picker
          selectedValue={value}
          onValueChange={(itemValue) => onChange(itemValue as BarcodeFormat)}
          accessibilityLabel="Barcode format selector"
          testID="format-picker"
        >
          {FORMAT_OPTIONS.map((format) => (
            <Picker.Item key={format} label={FORMAT_LABELS[format]} value={format} />
          ))}
        </Picker>
      </View>
    </View>
  );
};
