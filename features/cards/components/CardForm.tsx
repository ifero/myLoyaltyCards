/**
 * Card Form Component
 * Story 2.2: Add Card Manually
 *
 * Shared form component for Add Card and Edit Card (Story 2.7).
 * Uses react-hook-form with zod validation.
 *
 * Updated: Barcode format is auto-detected from value - user doesn't need to select it.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import * as z from 'zod';

import { barcodeFormatSchema, cardColorSchema } from '@/core/schemas';
import { inferBarcodeFormat, getBarcodeFormatDescription } from '@/core/utils';

import { useTheme } from '@/shared/theme';

import { ColorPicker } from './ColorPicker';

/**
 * Form validation schema per AC3 & AC4
 * Note: Defaults are handled via useForm defaultValues, not zod defaults
 * to ensure proper type compatibility with react-hook-form
 */
const cardFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Card name is required')
    .max(50, 'Card name must be 50 characters or less'),
  barcode: z.string().min(1, 'Barcode number is required'),
  barcodeFormat: barcodeFormatSchema,
  color: cardColorSchema
});

export type CardFormInput = z.infer<typeof cardFormSchema>;

interface CardFormProps {
  defaultValues?: Partial<CardFormInput>;
  onSubmit: (data: CardFormInput) => Promise<void>;
  submitLabel: string;
  isLoading?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  testID?: string;
  /** Focus name field on mount (defaults to true, set to true explicitly for scanned barcode flow) */
  focusNameOnMount?: boolean;
}

/**
 * CardForm - Shared form for Add/Edit card
 *
 * Features per acceptance criteria:
 * - AC2: Card Name, Barcode Number, Card Color fields
 * - AC3: Name validation with 50 char limit and character counter
 * - AC4: Numeric keypad for barcode input
 * - AC5: Format auto-detected from barcode value (user doesn't select)
 * - AC6: Color picker with 5 options, Grey default
 * - Save button disabled when form invalid
 */
export const CardForm = ({
  defaultValues,
  onSubmit,
  submitLabel,
  isLoading = false,
  onDirtyChange,
  testID,
  focusNameOnMount = true
}: CardFormProps) => {
  const { theme } = useTheme();
  const nameInputRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid, isDirty }
  } = useForm<CardFormInput>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: {
      name: '',
      barcode: '',
      barcodeFormat: defaultValues?.barcodeFormat || 'CODE128',
      color: 'grey',
      ...defaultValues
    },
    mode: 'onChange'
  });

  const nameValue = watch('name');
  const nameLength = nameValue?.length || 0;
  const barcodeValue = watch('barcode');
  const barcodeFormat = watch('barcodeFormat');

  // Auto-detect barcode format when barcode value changes (only for manual entry)
  useEffect(() => {
    // Skip auto-detection if format was provided via defaultValues (e.g., from scanner)
    if (defaultValues?.barcodeFormat) {
      return;
    }

    const inferredFormat = inferBarcodeFormat(barcodeValue || '');
    if (inferredFormat !== barcodeFormat) {
      setValue('barcodeFormat', inferredFormat);
    }
  }, [barcodeValue, defaultValues?.barcodeFormat, setValue, barcodeFormat]);

  // Notify parent of dirty state changes for discard confirmation (AC8)
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Auto-focus card name field per AC2 (or when returning from scanner with scanned barcode)
  useEffect(() => {
    if (focusNameOnMount) {
      const timeout = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [focusNameOnMount]);

  const handleFormSubmit = handleSubmit(async (data) => {
    await onSubmit(data);
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        testID={testID}
      >
        {/* Card Name Field - AC2, AC3 */}
        <View className="mb-4 mt-4">
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-xs text-gray-500">Card Name</Text>
            <Text className="text-xs text-gray-400">{nameLength}/50</Text>
          </View>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                ref={nameInputRef}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Enter card name"
                placeholderTextColor={theme.textSecondary}
                maxLength={50}
                testID="card-name-input"
                accessibilityLabel="Card name"
                className="rounded-lg border px-3 py-3"
                style={{
                  borderColor: errors.name ? '#EF4444' : theme.border,
                  color: theme.textPrimary,
                  backgroundColor: theme.surface
                }}
              />
            )}
          />
          {errors.name && (
            <Text className="mt-1 text-xs text-red-500" testID="name-error">
              {errors.name.message}
            </Text>
          )}
        </View>

        {/* Barcode Number Field - AC4 */}
        <View className="mb-4">
          <Text className="mb-1 text-xs text-gray-500">Barcode Number</Text>
          <Controller
            control={control}
            name="barcode"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Enter barcode number"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                testID="barcode-input"
                accessibilityLabel="Barcode number"
                className="rounded-lg border px-3 py-3"
                style={{
                  borderColor: errors.barcode ? '#EF4444' : theme.border,
                  color: theme.textPrimary,
                  backgroundColor: theme.surface
                }}
              />
            )}
          />
          {errors.barcode && (
            <Text className="mt-1 text-xs text-red-500" testID="barcode-error">
              {errors.barcode.message}
            </Text>
          )}
        </View>

        {/* Barcode Format Display - AC5 (Auto-detected) */}
        <View className="mb-4" testID="format-display">
          <Text className="mb-1 text-xs text-gray-500">Barcode Format (Auto-detected)</Text>
          <View
            className="rounded-lg border px-3 py-3"
            style={{
              borderColor: theme.border,
              backgroundColor: theme.surface
            }}
          >
            <Text style={{ color: theme.textPrimary }}>
              {getBarcodeFormatDescription(barcodeFormat)}
            </Text>
          </View>
        </View>

        {/* Color Picker - AC6 */}
        <View className="mb-6">
          <Controller
            control={control}
            name="color"
            render={({ field: { onChange, value } }) => (
              <ColorPicker value={value} onChange={onChange} testID="color-picker-container" />
            )}
          />
        </View>

        {/* Save Button - AC7 */}
        <Pressable
          onPress={handleFormSubmit}
          disabled={!isValid || isLoading}
          testID="save-button"
          accessibilityRole="button"
          accessibilityLabel={submitLabel}
          accessibilityState={{ disabled: !isValid || isLoading }}
          className="h-12 w-full items-center justify-center rounded-lg"
          style={{
            backgroundColor: '#73A973', // Sage Green
            opacity: !isValid || isLoading ? 0.5 : 1
          }}
        >
          <Text className="text-base font-semibold text-white">
            {isLoading ? 'Saving...' : submitLabel}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
