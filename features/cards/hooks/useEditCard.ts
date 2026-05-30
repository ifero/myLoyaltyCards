/**
 * useEditCard Hook
 * Story 2.7: Edit Card
 *
 * Hook for updating an existing loyalty card with haptic feedback and toast.
 */

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { updateCard as updateCardInDb, getCardById } from '@/core/database';
import { LoyaltyCard, BarcodeFormat, CardColor } from '@/core/schemas';
import { markDirty } from '@/core/sync';

import { useAuthState } from '@/shared/supabase/useAuthState';
import { showToast } from '@/shared/toast';

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
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthState();

  const editCard = useCallback(
    async (id: string, input: EditCardInput) => {
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

        // Sync trigger: mark dirty so background sync picks up the edit
        if (isAuthenticated) {
          await markDirty();
        }

        // Success feedback per AC9
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await showToast({
          title: t('cards.edit.savedTitle'),
          preset: 'done'
        });

        // Navigate back to card details
        router.back();
      } catch (err) {
        const message = t('cards.edit.failedMessage');
        setError(message);

        console.error('[useEditCard] Failed to update card', err);

        // Error feedback
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        await showToast({
          title: t('cards.edit.errorTitle'),
          message,
          preset: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, t]
  );

  return { editCard, isLoading, error };
}
