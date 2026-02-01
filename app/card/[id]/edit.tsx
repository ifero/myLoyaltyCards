/**
 * Edit Card Screen
 * Story 2.7: Edit Card
 *
 * Allows users to update their card's information including:
 * - Card name
 * - Barcode number
 * - Barcode format (auto-detected)
 * - Card color
 *
 * Uses shared CardForm component from Story 2.2.
 */

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, ActivityIndicator, Alert, BackHandler } from 'react-native';

import { getCardById } from '@/core/database';
import { LoyaltyCard } from '@/core/schemas';

import { useTheme, SAGE_COLORS } from '@/shared/theme';
import { SPACING } from '@/shared/theme/spacing';

import { CardForm, CardFormInput } from '@/features/cards';
import { useEditCard } from '@/features/cards/hooks/useEditCard';

const EditCardScreen = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [card, setCard] = useState<LoyaltyCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { editCard, isLoading: isUpdating } = useEditCard();

  // Track if form has unsaved changes for discard confirmation (AC10)
  const isDirtyRef = useRef(false);

  /**
   * Fetch card data from database
   */
  useEffect(() => {
    const fetchCard = async () => {
      if (!id) {
        setError('Invalid card ID');
        setIsLoading(false);
        return;
      }

      try {
        const cardData = await getCardById(id);
        if (cardData) {
          setCard(cardData);
        } else {
          setError('Card not found');
        }
      } catch (err) {
        console.error('Failed to fetch card:', err);
        setError('Failed to load card details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCard();
  }, [id]);

  /**
   * Handle form dirty state changes
   */
  const handleDirtyChange = useCallback((isDirty: boolean) => {
    isDirtyRef.current = isDirty;
  }, []);

  /**
   * Show discard confirmation dialog (AC10)
   */
  const showDiscardConfirmation = useCallback(() => {
    Alert.alert('Discard changes?', 'You have unsaved changes that will be lost.', [
      { text: 'Keep Editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => router.back()
      }
    ]);
  }, [router]);

  /**
   * Handle back navigation with discard confirmation
   */
  const handleBackPress = useCallback(() => {
    if (isDirtyRef.current) {
      showDiscardConfirmation();
      return true; // Prevent default back behavior
    }
    return false; // Allow default back behavior
  }, [showDiscardConfirmation]);

  // Handle hardware back button on Android (AC10)
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => subscription.remove();
  }, [handleBackPress]);

  /**
   * Handle form submission
   */
  const handleSubmit = async (data: CardFormInput) => {
    if (!id) return;
    await editCard(id, data);
  };

  // Loading state
  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Edit Card',
            headerBackTitle: 'Cancel'
          }}
        />
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.background
          }}
        >
          <ActivityIndicator size="large" color={SAGE_COLORS[500]} />
        </View>
      </>
    );
  }

  // Error state
  if (error || !card) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Edit Card'
          }}
        />
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: SPACING.lg,
            backgroundColor: theme.background
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.textPrimary,
              marginBottom: SPACING.sm
            }}
          >
            {error || 'Card not found'}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: theme.textSecondary,
              textAlign: 'center'
            }}
          >
            The card you're trying to edit doesn't exist or has been deleted.
          </Text>
        </View>
      </>
    );
  }

  // Success state - render edit form
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Edit Card',
          headerBackTitle: 'Cancel'
        }}
      />
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <CardForm
          defaultValues={{
            name: card.name,
            barcode: card.barcode,
            barcodeFormat: card.barcodeFormat,
            color: card.color
          }}
          onSubmit={handleSubmit}
          submitLabel="Save"
          isLoading={isUpdating}
          onDirtyChange={handleDirtyChange}
          focusNameOnMount={false}
          testID="edit-card-form"
        />
      </View>
    </>
  );
};

export default EditCardScreen;
