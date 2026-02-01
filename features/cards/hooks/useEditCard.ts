/**
 * useEditCard Hook
 * Story 2.7: Edit Card
 *
 * Hook for updating an existing loyalty card with haptic feedback and toast.
 */

import * as Burnt from 'burnt';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import { updateCard as updateCardInDb, getCardById } from '@/core/database';
import { LoyaltyCard, BarcodeFormat, CardColor } from '@/core/schemas';

/**
 * Input type for editing a card (subset of LoyaltyCard)
 */
export interface EditCardInput {
  name: string;
  barcode: string;
  barcodeFormat: BarcodeFormat;
  color: CardColor;
}

interface UseEditCardReturn {
  editCard: (id: string, input: EditCardInput) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * useEditCard - Hook for card update logic
 *
 * Per Story 2.7 Acceptance Criteria:
 * - AC3-AC6: Updates name, barcode, format, and color
 * - AC8: Sets updatedAt timestamp to current time
 * - AC9: Shows haptic + toast feedback on success
 * - Navigates back to card details screen
 */
export function useEditCard(): UseEditCardReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editCard = useCallback(async (id: string, input: EditCardInput) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get existing card to preserve non-editable fields
      const existingCard = await getCardById(id);

      if (!existingCard) {
        throw new Error('Card not found');
      }

      const now = new Date().toISOString();

      // Merge updates with existing card data
      const updatedCard: LoyaltyCard = {
        ...existingCard,
        name: input.name.trim(),
        barcode: input.barcode.trim(),
        barcodeFormat: input.barcodeFormat,
        color: input.color,
        updatedAt: now
        // createdAt remains unchanged per AC8
      };

      await updateCardInDb(updatedCard);

      // Success feedback per AC9
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Burnt.toast({
        title: 'Card saved',
        preset: 'done'
      });

      // Navigate back to card details
      router.back();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update card';
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

  return { editCard, isLoading, error };
}
