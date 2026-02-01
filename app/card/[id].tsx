/**
 * Card Details Screen
 * Story 2.6: View Card Details
 * Story 2.8: Delete Card
 *
 * Displays full details of a loyalty card with ability to:
 * - View all card information
 * - Copy barcode number to clipboard
 * - Open full-screen barcode (Barcode Flash)
 * - Navigate to Edit Card (Story 2.7)
 * - Delete card with confirmation (Story 2.8)
 */

import burnt from 'burnt';
import { useLocalSearchParams, Stack, useFocusEffect } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

import { getCardById } from '@/core/database';
import { LoyaltyCard } from '@/core/schemas';

import { useTheme, SAGE_COLORS } from '@/shared/theme';
import { SPACING } from '@/shared/theme/spacing';

import { CardDetails, useDeleteCard } from '@/features/cards';

const CardDetailsScreen = () => {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [card, setCard] = useState<LoyaltyCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete card hook (Story 2.8)
  const { deleteCard, isDeleting } = useDeleteCard(id ?? '');

  /**
   * Fetch card data from database
   * Uses useFocusEffect to refresh data when returning from edit screen
   */
  useFocusEffect(
    useCallback(() => {
      const fetchCard = async () => {
        if (!id) {
          setError('Invalid card ID');
          setIsLoading(false);
          return;
        }

        try {
          setIsLoading(true);
          const cardData = await getCardById(id);
          if (cardData) {
            setCard(cardData);
            setError(null);
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
    }, [id])
  );

  /**
   * Show toast notification when barcode is copied
   */
  const handleCopy = useCallback(() => {
    burnt.toast({
      title: 'Copied to clipboard ✓',
      preset: 'done',
      haptic: 'success',
      duration: 2
    });
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Card Details'
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
            title: 'Card Details'
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
            The card you're looking for doesn't exist or has been deleted.
          </Text>
        </View>
      </>
    );
  }

  // Success state - render card details
  return (
    <>
      <Stack.Screen
        options={{
          title: card.name
        }}
      />
      <CardDetails card={card} onCopy={handleCopy} onDelete={deleteCard} isDeleting={isDeleting} />
    </>
  );
};

export default CardDetailsScreen;
