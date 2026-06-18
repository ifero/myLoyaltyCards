/**
 * useAddCard Hook
 * Story 2.2: Add Card Manually
 *
 * Hook for adding a new loyalty card with haptic feedback and toast.
 */

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';

import { insertCard } from '@/core/database';
import { LoyaltyCard, BarcodeFormat, CardColor } from '@/core/schemas';
import { markDirty } from '@/core/sync';
import { logger } from '@/core/utils/logger';

import { useAuthState } from '@/shared/supabase/useAuthState';
import { showToast } from '@/shared/toast';

/**
 * Input type for adding a card (subset of LoyaltyCard)
 */
export interface AddCardInput {
  name: string;
  barcode: string;
  barcodeFormat: BarcodeFormat;
  color: CardColor;
  brandId?: string; // Optional brand ID from catalogue
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
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthState();

  const addCard = useCallback(
    async (input: AddCardInput) => {
      setIsLoading(true);
      setError(null);

      try {
        const now = new Date().toISOString();

        const card: LoyaltyCard = {
          id: uuidv4(),
          name: input.name.trim(),
          barcode: input.barcode.trim(),
          barcodeFormat: input.barcodeFormat,
          brandId: input.brandId ?? null, // Use provided brandId or null for custom cards
          color: input.color,
          isFavorite: false,
          lastUsedAt: null,
          usageCount: 0,
          createdAt: now,
          updatedAt: now
        };

        await insertCard(card);

        // Sync trigger: mark dirty so background sync picks up the new card
        if (isAuthenticated) {
          await markDirty();
        }

        // Success feedback per AC7
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await showToast({
          title: t('cards.add.successTitle'),
          preset: 'done'
        });

        // Navigate to main cards list page with new card ID for highlight
        router.replace({
          pathname: '/',
          params: { newCardId: card.id, newCardName: card.name }
        });
      } catch (err) {
        const message = t('cards.add.failedMessage');
        setError(message);

        logger.error('[useAddCard] Failed to add card', err);

        // Error feedback
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        await showToast({
          title: t('cards.add.errorTitle'),
          message,
          preset: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, t]
  );

  return { addCard, isLoading, error };
}
