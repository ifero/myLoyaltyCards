/**
 * useDeleteCard Hook
 * Story 2.8: Delete Card
 *
 * Hook that encapsulates card deletion logic including:
 * - Database deletion
 * - Haptic feedback (success)
 * - Toast notification
 * - Navigation to card list
 *
 * Works offline - deletion is local-only for MVP.
 */

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import { deleteCard as deleteCardFromDb } from '@/core/database';
import { addPendingDeletion, markDirty } from '@/core/sync';

import { useAuthState } from '@/shared/supabase/useAuthState';
import { showToast } from '@/shared/toast';

export interface UseDeleteCardReturn {
  /** Async function to delete the card */
  deleteCard: () => Promise<boolean>;
  /** Whether delete operation is in progress */
  isDeleting: boolean;
  /** Error message if deletion failed */
  error: string | null;
}

/**
 * Hook for deleting a loyalty card
 *
 * @param cardId - ID of the card to delete
 * @returns Object with deleteCard function, isDeleting state, and error
 *
 * @example
 * ```tsx
 * const { deleteCard, isDeleting } = useDeleteCard(card.id);
 *
 * const handleConfirmDelete = async () => {
 *   await deleteCard();
 * };
 * ```
 */
export function useDeleteCard(cardId: string): UseDeleteCardReturn {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuthState();

  const deleteCard = useCallback(async (): Promise<boolean> => {
    if (!cardId) {
      setError('Invalid card ID');
      return false;
    }

    setIsDeleting(true);
    setError(null);

    try {
      // Track deletion for cloud sync BEFORE local delete
      if (isAuthenticated) {
        await addPendingDeletion(cardId);
      }

      // Delete from local database
      await deleteCardFromDb(cardId);

      // Mark dirty so background sync picks up the deletion
      if (isAuthenticated) {
        await markDirty();
      }

      // Success feedback - haptic
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Success feedback - toast
      await showToast({
        title: 'Card deleted',
        preset: 'done',
        haptic: 'success',
        duration: 2
      });

      // Navigate to card list (replace to prevent going back to deleted card)
      router.replace('/');

      return true;
    } catch (err) {
      console.error('Failed to delete card:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete card';
      setError(errorMessage);

      // Error feedback - toast
      await showToast({
        title: 'Failed to delete card',
        preset: 'error',
        haptic: 'error',
        duration: 3
      });

      setIsDeleting(false); // Only reset loading state on failure (success unmounts)
      return false;
    }
  }, [cardId, isAuthenticated]);

  return {
    deleteCard,
    isDeleting,
    error
  };
}
