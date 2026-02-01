/**
 * Add Card Screen
 * Story 2.2: Add Card Manually
 * Story 2.3: Scan Barcode with Camera (integration)
 *
 * Screen for adding a new loyalty card with form validation.
 * Supports barcode scanning via route params.
 */

import { useRouter, useFocusEffect, useNavigation, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import { View, Alert, BackHandler, Text, Pressable } from 'react-native';

import { BarcodeFormat } from '@/core/schemas';

import { useTheme, SEMANTIC_COLORS } from '@/shared/theme';

import { CardForm, CardFormInput } from '@/features/cards/components/CardForm';
import { useAddCard } from '@/features/cards/hooks/useAddCard';

/**
 * AddCardScreen - Add a new loyalty card
 *
 * Features per acceptance criteria:
 * - AC1: Access via "+" button in header
 * - AC2-AC6: Form with validation via CardForm
 * - AC7: Save with haptic + toast feedback via useAddCard
 * - AC8: Back navigation with discard confirmation (only on explicit back button)
 * - Story 2.3 AC1: "Scan Barcode" option to access scanner
 * - Story 2.3 AC5: Pre-fill barcode from scanner with success indicator
 */
const AddCardScreen = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const { addCard, isLoading } = useAddCard();

  // Get scanned barcode from route params (Story 2.3 AC5)
  const params = useLocalSearchParams<{
    scannedBarcode?: string;
    scannedFormat?: BarcodeFormat;
  }>();

  // Track if we've shown the scan success indicator
  const [showScanSuccess, setShowScanSuccess] = useState(false);

  // Show success indicator when barcode is scanned (Story 2.3 AC5)
  useEffect(() => {
    if (params.scannedBarcode) {
      setShowScanSuccess(true);
      // Hide after 3 seconds
      const timer = setTimeout(() => setShowScanSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [params.scannedBarcode]);

  // Calculate default values from scanned data
  const defaultValues = useMemo(() => {
    if (params.scannedBarcode) {
      return {
        barcode: params.scannedBarcode,
        barcodeFormat: params.scannedFormat || ('CODE128' as BarcodeFormat)
      };
    }
    return undefined;
  }, [params.scannedBarcode, params.scannedFormat]);

  // Track if form has been modified for AC8
  const isFormDirtyRef = useRef(false);
  // Track if we're programmatically navigating (after successful save)
  const isProgrammaticNavigationRef = useRef(false);

  /**
   * Handle form submission - AC7
   */
  const handleSubmit = useCallback(
    async (data: CardFormInput) => {
      // Mark as programmatic navigation to skip discard confirmation
      isProgrammaticNavigationRef.current = true;
      await addCard(data);
      isFormDirtyRef.current = false;
    },
    [addCard]
  );

  /**
   * Track form dirty state - AC8
   */
  const handleDirtyChange = useCallback((isDirty: boolean) => {
    isFormDirtyRef.current = isDirty;
  }, []);

  /**
   * Show discard confirmation dialog - AC8
   */
  const showDiscardConfirmation = useCallback(() => {
    Alert.alert(
      'Discard changes?',
      'You have unsaved changes. Are you sure you want to discard them?',
      [
        {
          text: 'Keep Editing',
          style: 'cancel'
        },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            isFormDirtyRef.current = false;
            router.back();
          }
        }
      ],
      { cancelable: true }
    );
  }, [router]);

  const navigation = useNavigation();

  /**
   * Handle back navigation (iOS gesture + navigation back button) - AC8
   * Only shows confirmation on user-initiated navigation, not programmatic
   */
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Skip confirmation if this is programmatic navigation (after successful save)
      if (isProgrammaticNavigationRef.current) {
        isProgrammaticNavigationRef.current = false;
        return; // Allow navigation without confirmation
      }

      if (!isFormDirtyRef.current) {
        // No unsaved changes, allow navigation
        return;
      }

      // Prevent default behavior of leaving the screen
      e.preventDefault();

      // Show confirmation dialog only for user-initiated navigation
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          {
            text: 'Keep Editing',
            style: 'cancel'
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              isFormDirtyRef.current = false;
              navigation.dispatch(e.data.action);
            }
          }
        ],
        { cancelable: true }
      );
    });

    return unsubscribe;
  }, [navigation]);

  /**
   * Handle hardware back button (Android) - AC8
   */
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (isFormDirtyRef.current) {
          showDiscardConfirmation();
          return true; // Prevent default back
        }
        return false; // Allow default back
      });

      return () => subscription.remove();
    }, [showDiscardConfirmation])
  );

  /**
   * Navigate to barcode scanner - Story 2.3 AC1
   */
  const handleScanBarcode = useCallback(() => {
    router.push('/scan');
  }, [router]);

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      {/* Scan Success Indicator - Story 2.3 AC5 */}
      {showScanSuccess && (
        <View
          className="mx-4 mt-2 rounded-lg p-3"
          style={{ backgroundColor: SEMANTIC_COLORS.success + '20' }}
        >
          <Text
            className="text-center text-sm font-medium"
            style={{ color: SEMANTIC_COLORS.success }}
          >
            ✓ Barcode scanned!
          </Text>
        </View>
      )}

      {/* Scan Barcode Button - Story 2.3 AC1 */}
      {!params.scannedBarcode && (
        <Pressable
          onPress={handleScanBarcode}
          className="mx-4 mt-4 h-12 flex-row items-center justify-center rounded-lg border"
          style={{
            borderColor: theme.primary,
            backgroundColor: theme.primary + '10'
          }}
          accessibilityRole="button"
          accessibilityLabel="Scan Barcode"
          testID="scan-barcode-button"
        >
          <Text className="text-base font-semibold" style={{ color: theme.primary }}>
            📷 Scan Barcode
          </Text>
        </Pressable>
      )}

      <CardForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitLabel="Add Card"
        isLoading={isLoading}
        onDirtyChange={handleDirtyChange}
        testID="add-card-form"
        focusNameOnMount={!!params.scannedBarcode}
      />
    </View>
  );
};

export default AddCardScreen;
