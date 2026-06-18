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
import { useEffect, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import * as z from 'zod';

import { barcodeFormatSchema, cardColorSchema } from '@/core/schemas';
import { inferBarcodeFormat } from '@/core/utils';

import { useTheme } from '@/shared/theme';

import { ColorPicker } from './ColorPicker';

/**
 * Form validation schema per AC3 & AC4
 * Note: Defaults are handled via useForm defaultValues, not zod defaults
 * to ensure proper type compatibility with react-hook-form
 */
const createCardFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(1, t('cards.form.nameRequired')).max(50, t('cards.form.nameMax')),
    barcode: z.string().min(1, t('cards.form.barcodeRequired')),
    barcodeFormat: barcodeFormatSchema,
    color: cardColorSchema,
    brandId: z.string().optional() // Story 3.3: Optional brand ID
  });

export type CardFormInput = z.infer<ReturnType<typeof createCardFormSchema>>;

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
  const { t } = useTranslation();
  const nameInputRef = useRef<TextInput>(null);
  const cardFormSchema = useMemo(() => createCardFormSchema(t), [t]);
  const barcodeFormatLabels = useMemo(
    () => ({
      CODE128: t('cards.form.barcodeFormat.CODE128'),
      EAN13: t('cards.form.barcodeFormat.EAN13'),
      EAN8: t('cards.form.barcodeFormat.EAN8'),
      QR: t('cards.form.barcodeFormat.QR'),
      CODE39: t('cards.form.barcodeFormat.CODE39'),
      UPCA: t('cards.form.barcodeFormat.UPCA')
    }),
    [t]
  );

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
      style={styles.flex1}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        testID={testID}
      >
        {/* Card Name Field - AC2, AC3 */}
        <View style={styles.firstField}>
          <View style={styles.labelRow}>
            <Text style={styles.labelText}>{t('cards.form.nameLabel')}</Text>
            <Text style={styles.counterText}>{nameLength}/50</Text>
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
                placeholder={t('cards.form.namePlaceholder')}
                placeholderTextColor={theme.textSecondary}
                maxLength={50}
                testID="card-name-input"
                accessibilityLabel={t('cards.form.nameAccessibilityLabel')}
                style={[
                  styles.input,
                  {
                    borderColor: errors.name ? '#EF4444' : theme.border,
                    color: theme.textPrimary,
                    backgroundColor: theme.surface
                  }
                ]}
              />
            )}
          />
          {errors.name && (
            <Text style={styles.errorText} testID="name-error">
              {errors.name.message}
            </Text>
          )}
        </View>

        {/* Barcode Number Field - AC4 */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('cards.form.barcodeLabel')}</Text>
          <Controller
            control={control}
            name="barcode"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={t('cards.form.barcodePlaceholder')}
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                testID="barcode-input"
                accessibilityLabel={t('cards.form.barcodeAccessibilityLabel')}
                style={[
                  styles.input,
                  {
                    borderColor: errors.barcode ? '#EF4444' : theme.border,
                    color: theme.textPrimary,
                    backgroundColor: theme.surface
                  }
                ]}
              />
            )}
          />
          {errors.barcode && (
            <Text style={styles.errorText} testID="barcode-error">
              {errors.barcode.message}
            </Text>
          )}
        </View>

        {/* Barcode Format Display - AC5 (Auto-detected) */}
        <View style={styles.field} testID="format-display">
          <Text style={styles.fieldLabel}>{t('cards.form.barcodeFormatLabel')}</Text>
          <View
            style={[
              styles.input,
              {
                borderColor: theme.border,
                backgroundColor: theme.surface
              }
            ]}
          >
            <Text style={{ color: theme.textPrimary }}>{barcodeFormatLabels[barcodeFormat]}</Text>
          </View>
        </View>

        {/* Color Picker - AC6 */}
        <View style={styles.lastField}>
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
          style={[
            styles.saveButton,
            {
              backgroundColor: theme.primary,
              opacity: !isValid || isLoading ? 0.5 : 1
            }
          ]}
        >
          <Text style={styles.saveLabel}>{isLoading ? t('cards.form.saving') : submitLabel}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex1: {
    flex: 1
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 32
  },
  firstField: {
    marginBottom: 32,
    marginTop: 32
  },
  field: {
    marginBottom: 32
  },
  lastField: {
    marginBottom: 48
  },
  labelRow: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  labelText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#6B7280'
  },
  counterText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#9CA3AF'
  },
  fieldLabel: {
    marginBottom: 8,
    fontSize: 12,
    lineHeight: 16,
    color: '#6B7280'
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 24
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    color: '#EF4444'
  },
  saveButton: {
    height: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8
  },
  saveLabel: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: '#FFFFFF'
  }
});
