/**
 * CardSetupScreen
 * Story 13.4: Restyle Add Card Flow (AC5, AC6, T4, T5)
 *
 * Dual-mode screen:
 * - Catalogue mode: brand header + card number (pre-filled) + "Done"
 * - Custom mode: store name + card number with inline scan CTA + color picker + "Done"
 *
 * On "Done": saves card via useAddCard, pops entire add-card stack, navigates home.
 */

import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  AccessibilityInfo
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CatalogueRepository } from '@/core/catalogue/catalogue-repository';
import { BarcodeFormat, CardColor } from '@/core/schemas';
import { mapHexToCardColor } from '@/core/utils';

import { Button } from '@/shared/components/ui/Button';
import { ColorPicker } from '@/shared/components/ui/ColorPicker';
import { TextField } from '@/shared/components/ui/TextField';
import { useTheme } from '@/shared/theme';
import { getContrastForeground } from '@/shared/theme/luminance';
import { SPACING, LAYOUT, TOUCH_TARGET } from '@/shared/theme/spacing';

import { useAddCard } from '@/features/cards/hooks/useAddCard';
import { getBrandLogoComponent } from '@/features/cards/utils/brandLogos';

import { CatalogueBrand } from '@/catalogue/types';

import { InlineScanButton } from '../components/InlineScanButton';

type SetupParams = {
  mode: 'catalogue' | 'custom';
  brandId?: string;
  brandName?: string;
  brandColor?: string;
  brandLogo?: string;
  barcode?: string;
  barcodeFormat?: string;
};

/** Brand header for catalogue mode */
const BrandHeader: React.FC<{ brand: CatalogueBrand }> = ({ brand }) => {
  const LogoComponent = getBrandLogoComponent(brand.logo);
  const fgColor = getContrastForeground(brand.color);

  return (
    <View style={[styles.brandHeader, { backgroundColor: brand.color }]}>
      <View style={styles.brandLogoCircle}>
        {LogoComponent ? (
          <LogoComponent width={32} height={32} color={fgColor} />
        ) : (
          <Text style={[styles.brandFallbackLetter, { color: fgColor }]}>
            {brand.name.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <Text style={[styles.brandName, { color: fgColor }]}>{brand.name}</Text>
    </View>
  );
};

export const CardSetupScreen: React.FC = () => {
  const { theme } = useTheme();
  const params = useLocalSearchParams<SetupParams>();
  const { addCard, isLoading } = useAddCard();

  const mode = params.mode ?? 'custom';

  useEffect(() => {
    const announcement = mode === 'catalogue' ? 'Card setup screen' : 'New card screen';
    AccessibilityInfo.announceForAccessibility?.(announcement);
  }, [mode]);

  // Resolve brand for catalogue mode
  const brand = useMemo<CatalogueBrand | undefined>(() => {
    if (mode !== 'catalogue' || !params.brandId) return undefined;
    const catalogueBrand = CatalogueRepository.getInstance().getBrandById(params.brandId);
    if (catalogueBrand) return catalogueBrand;
    if (params.brandName && params.brandColor) {
      return {
        id: params.brandId,
        name: params.brandName,
        color: params.brandColor,
        logo: params.brandLogo ?? '',
        aliases: [],
        barcodeFormats: []
      };
    }
    return undefined;
  }, [mode, params.brandId, params.brandName, params.brandColor, params.brandLogo]);

  // Form state
  const [storeName, setStoreName] = useState('');
  const [cardNumber, setCardNumber] = useState(params.barcode ?? '');
  const [color, setColor] = useState<CardColor>(brand ? mapHexToCardColor(brand.color) : 'blue');
  const [storeNameError, setStoreNameError] = useState('');
  const barcodeFormat = (params.barcodeFormat as BarcodeFormat) ?? 'CODE128';

  const handleDone = useCallback(async () => {
    // Validate custom mode required fields
    if (mode === 'custom') {
      const trimmedName = storeName.trim();
      if (!trimmedName) {
        setStoreNameError('Store name is required');
        return;
      }
      setStoreNameError('');
    }

    const name = mode === 'catalogue' ? (brand?.name ?? '') : storeName.trim();
    const cardColor = mode === 'catalogue' ? mapHexToCardColor(brand?.color ?? '#1A73E8') : color;

    await addCard({
      name,
      barcode: cardNumber.trim(),
      barcodeFormat,
      color: cardColor,
      brandId: brand?.id
    });

    // Pop entire add-card stack and go home
    // The useAddCard hook already navigates to '/'
  }, [mode, storeName, cardNumber, color, barcodeFormat, brand, addCard]);

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  const handleInlineScan = useCallback(() => {
    // Navigate to scanner, returning to this screen with result
    router.push({
      pathname: '/add-card/scan',
      params: {
        brandId: brand?.id ?? '',
        brandName: brand?.name ?? '',
        brandColor: brand?.color ?? '',
        brandLogo: brand?.logo ?? '',
        returnToSetup: 'true'
      }
    });
  }, [brand]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top', 'bottom']}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header with back button */}
        <View style={styles.header}>
          <Pressable
            onPress={handleBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            testID="setup-back-button"
          >
            <MaterialIcons name="chevron-left" size={28} color={theme.textPrimary} />
          </Pressable>
          <Text
            style={[styles.headerTitle, { color: theme.textPrimary }]}
            accessibilityRole="header"
          >
            {mode === 'catalogue' ? 'Card Setup' : 'New Card'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Catalogue mode: brand header */}
          {mode === 'catalogue' && brand && <BrandHeader brand={brand} />}

          {/* Card preview area */}
          <View style={styles.formSection}>
            {/* Custom mode: Store name */}
            {mode === 'custom' && (
              <TextField
                label="Store name"
                value={storeName}
                onChangeText={(text) => {
                  setStoreName(text);
                  if (storeNameError) setStoreNameError('');
                }}
                placeholder="Enter store name"
                error={storeNameError}
                testID="store-name-field"
              />
            )}

            {/* Card number with optional inline scan button */}
            <View style={styles.cardNumberRow}>
              <View style={styles.cardNumberField}>
                <TextField
                  label="Card number"
                  value={cardNumber}
                  onChangeText={setCardNumber}
                  placeholder="Enter or scan card number"
                  testID="card-number-field"
                />
              </View>
              {mode === 'custom' && (
                <View style={styles.inlineScanContainer}>
                  <InlineScanButton onPress={handleInlineScan} testID="inline-scan-button" />
                </View>
              )}
            </View>

            {/* Custom mode: Color picker */}
            {mode === 'custom' && (
              <View style={styles.colorSection}>
                <Text style={[styles.colorLabel, { color: theme.textPrimary }]}>Card color</Text>
                <ColorPicker value={color} onChange={setColor} testID="color-picker" />
              </View>
            )}
          </View>
        </ScrollView>

        {/* Done button pinned to bottom */}
        <View style={styles.bottomAction}>
          <Button
            variant="primary"
            onPress={handleDone}
            loading={isLoading}
            disabled={isLoading}
            testID="done-button"
          >
            Done
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  flex: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.screenHorizontalMargin - 8,
    height: TOUCH_TARGET.min
  },
  backButton: {
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600'
  },
  headerSpacer: {
    width: TOUCH_TARGET.min
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: LAYOUT.screenHorizontalMargin
  },
  brandHeader: {
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg
  },
  brandLogoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  brandFallbackLetter: {
    fontSize: 28,
    fontWeight: '700'
  },
  brandName: {
    fontSize: 20,
    fontWeight: '600'
  },
  formSection: {
    gap: SPACING.lg,
    paddingTop: SPACING.md
  },
  cardNumberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.xs
  },
  cardNumberField: {
    flex: 1
  },
  inlineScanContainer: {
    paddingBottom: 2
  },
  colorSection: {
    gap: SPACING.sm
  },
  colorLabel: {
    fontSize: 13,
    fontWeight: '600'
  },
  bottomAction: {
    paddingHorizontal: LAYOUT.screenHorizontalMargin,
    paddingVertical: SPACING.md
  }
});
