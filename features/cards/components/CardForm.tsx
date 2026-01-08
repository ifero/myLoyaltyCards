/**
 * Card Form Component
 * Story 2.2: Add Card Manually
 *
 * Shared form component for Add Card and Edit Card (Story 2.7).
 * Uses react-hook-form with zod validation.
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

import { useTheme } from '@/shared/theme';

import { ColorPicker } from './ColorPicker';
import { FormatPicker } from './FormatPicker';

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
}

/**
 * CardForm - Shared form for Add/Edit card
 *
 * Features per acceptance criteria:
 * - AC2: Card Name, Barcode Number, Barcode Format, Card Color fields
 * - AC3: Name validation with 50 char limit and character counter
 * - AC4: Numeric keypad for barcode input
 * - AC5: Format picker with 6 options, Code 128 default
 * - AC6: Color picker with 5 options, Grey default
 * - Save button disabled when form invalid
 */
export const CardForm = ({
  defaultValues,
  onSubmit,
  submitLabel,
  isLoading = false,
  onDirtyChange,
  testID
}: CardFormProps) => {
  const { theme } = useTheme();
  const nameInputRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isValid, isDirty }
  } = useForm<CardFormInput>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: {
      name: '',
      barcode: '',
      barcodeFormat: 'CODE128',
      color: 'grey',
      ...defaultValues
    },
    mode: 'onChange'
  });

  const nameValue = watch('name');
  const nameLength = nameValue?.length || 0;

  // Notify parent of dirty state changes for discard confirmation (AC8)
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Auto-focus card name field per AC2
  useEffect(() => {
    const timeout = setTimeout(() => {
      nameInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timeout);
  }, []);

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

        {/* Barcode Format Picker - AC5 */}
        <View className="mb-4">
          <Controller
            control={control}
            name="barcodeFormat"
            render={({ field: { onChange, value } }) => (
              <FormatPicker value={value} onChange={onChange} testID="format-picker-container" />
            )}
          />
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
