/**
 * useAddCard Hook
 * Story 2.2: Add Card Manually
 *
 * Hook for adding a new loyalty card with haptic feedback and toast.
 */

import * as Burnt from 'burnt';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { insertCard } from '@/core/database';
import { LoyaltyCard, BarcodeFormat, CardColor } from '@/core/schemas';

/**
 * Input type for adding a card (subset of LoyaltyCard)
 */
export interface AddCardInput {
  name: string;
  barcode: string;
  barcodeFormat: BarcodeFormat;
  color: CardColor;
}

interface UseAddCardReturn {
  addCard: (input: AddCardInput) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * useAddCard - Hook for card creation logic
 *
 * Per AC7:
 * - Generates UUID for the card
 * - Sets createdAt and updatedAt timestamps to now
 * - Sets usageCount to 0, isFavorite to false
 * - Sets lastUsedAt and brandId to null
 * - Shows haptic + toast feedback on success
 * - Navigates back to card list
 */
export function useAddCard(): UseAddCardReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addCard = useCallback(async (input: AddCardInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const now = new Date().toISOString();

      const card: LoyaltyCard = {
        id: uuidv4(),
        name: input.name.trim(),
        barcode: input.barcode.trim(),
        barcodeFormat: input.barcodeFormat,
        brandId: null, // Custom card
        color: input.color,
        isFavorite: false,
        lastUsedAt: null,
        usageCount: 0,
        createdAt: now,
        updatedAt: now
      };

      await insertCard(card);

      // Success feedback per AC7
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Burnt.toast({
        title: 'Card added',
        preset: 'done'
      });

      // Navigate back to card list
      router.back();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add card';
      setError(message);

      console.error(message);

      // Error feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Burnt.toast({
        title: 'Error',
        message,
        preset: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { addCard, isLoading, error };
}
