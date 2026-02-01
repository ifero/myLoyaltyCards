/**
 * Barcode Flash Screen
 * Story 2.5: Display Barcode (Barcode Flash)
 *
 * Full-screen modal that displays a card's barcode optimized for scanning.
 * Accessed via: /barcode/[id]
 *
 * Features:
 * - Auto-maximizes screen brightness
 * - White background for maximum contrast
 * - Dismissible via tap, swipe, or back button
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { getCardById } from '@/core/database';
import type { LoyaltyCard } from '@/core/schemas';

import { BarcodeFlash } from '@/features/cards/components/BarcodeFlash';

/**
 * Barcode Flash Screen Component
 *
 * Dynamic route that displays a card's barcode in full-screen mode.
 * The card ID is extracted from the URL parameter.
 */
export default function BarcodeFlashScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [card, setCard] = useState<LoyaltyCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load card data
  useEffect(() => {
    async function loadCard() {
      if (!id) {
        setError('Card ID is required');
        setIsLoading(false);
        return;
      }

      try {
        const loadedCard = await getCardById(id);
        if (loadedCard) {
          setCard(loadedCard);
        } else {
          setError('Card not found');
        }
      } catch (err) {
        console.error('Failed to load card:', err);
        setError('Failed to load card');
      } finally {
        setIsLoading(false);
      }
    }

    loadCard();
  }, [id]);

  // Handle dismiss
  const handleDismiss = () => {
    router.back();
  };

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  // Error state
  if (error || !card) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-4">
        <Text className="text-center text-lg font-semibold text-red-500">
          {error || 'Card not found'}
        </Text>
        <Text className="mt-4 text-center text-base text-gray-600" onPress={handleDismiss}>
          Tap to go back
        </Text>
      </View>
    );
  }

  return <BarcodeFlash card={card} onDismiss={handleDismiss} />;
}
