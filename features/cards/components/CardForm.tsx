/**
 * Card Form Component
 * Story 2.2: Add Card Manually
 * Story 22.1: Draws its fields with the shared TextField and saves with the shared Button (AC2, AC6)
 *
 * Shared form component for Add Card and Edit Card (Story 2.7).
 * Uses react-hook-form with zod validation.
 *
 * Updated: Barcode format is auto-detected from value - user doesn't need to select it.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import * as z from 'zod';

import { barcodeFormatSchema, cardColorSchema } from '@/core/schemas';
import { inferBarcodeFormat } from '@/core/utils';

import { Button } from '@/shared/components/ui/Button';
import { FieldLabel, TextField } from '@/shared/components/ui/TextField';
import { TYPOGRAPHY } from '@/shared/theme/typography';

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
 * - Save is ALWAYS enabled: pressing it on an incomplete form reveals the field
 *   errors and focuses the first one (Story 22.1, AC2 — it used to sit disabled)
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
  const { t } = useTranslation();
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
    setFocus,
    formState: { errors, isDirty }
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

  // Auto-focus card name field per AC2 (or when returning from scanner with scanned barcode).
  // Through the form's own field ref — the same one `handleSubmit` uses to focus the first
  // invalid field — rather than a second ref to the same input.
  useEffect(() => {
    if (focusNameOnMount) {
      const timeout = setTimeout(() => {
        setFocus('name');
      }, 100);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [focusNameOnMount, setFocus]);

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
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value, ref } }) => (
              <TextField
                ref={ref}
                label={t('cards.form.nameLabel')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={t('cards.form.namePlaceholder')}
                maxLength={50}
                showCharacterCount
                error={errors.name?.message}
                testID="card-name-input"
                accessibilityLabel={t('cards.form.nameAccessibilityLabel')}
              />
            )}
          />
        </View>

        {/* Barcode Number Field - AC4 */}
        <View style={styles.field}>
          <Controller
            control={control}
            name="barcode"
            render={({ field: { onChange, onBlur, value, ref } }) => (
              <TextField
                ref={ref}
                label={t('cards.form.barcodeLabel')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={t('cards.form.barcodePlaceholder')}
                keyboardType="number-pad"
                mono
                error={errors.barcode?.message}
                testID="barcode-input"
                accessibilityLabel={t('cards.form.barcodeAccessibilityLabel')}
              />
            )}
          />
        </View>

        {/* Barcode Format Display - AC5 (Auto-detected). Information, not a control: the
            uppercase label over a plain value is what keeps it from reading as an input. */}
        <View style={styles.field} testID="format-display">
          <FieldLabel>{t('cards.form.barcodeFormatLabel')}</FieldLabel>
          <Text style={styles.formatValue}>{barcodeFormatLabels[barcodeFormat]}</Text>
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

        {/* Save Button - AC7. Always enabled (Story 22.1, AC2): an incomplete form answers the
            press with its errors. Busy keeps the fill and shows a spinner, and is announced by
            the "Saving..." name rather than as a disabled control. */}
        <Button
          variant="primary"
          size="large"
          onPress={handleFormSubmit}
          loading={isLoading}
          testID="save-button"
          accessibilityLabel={isLoading ? t('cards.form.saving') : submitLabel}
        >
          {submitLabel}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create((theme) => ({
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
  // The format is a Text, not a field, so it keeps the token's line height.
  formatValue: {
    ...TYPOGRAPHY.bodyLg,
    color: theme.colors.textPrimary,
    marginTop: 6
  }
}));
