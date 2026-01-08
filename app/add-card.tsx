/**
 * Add Card Screen
 * Story 2.2: Add Card Manually
 *
 * Screen for adding a new loyalty card with form validation.
 */

import { useRouter, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useRef, useEffect } from 'react';
import { View, Alert, BackHandler } from 'react-native';

import { useTheme } from '@/shared/theme';

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
 */
const AddCardScreen = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const { addCard, isLoading } = useAddCard();

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

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <CardForm
        onSubmit={handleSubmit}
        submitLabel="Add Card"
        isLoading={isLoading}
        onDirtyChange={handleDirtyChange}
        testID="add-card-form"
      />
    </View>
  );
};

export default AddCardScreen;
