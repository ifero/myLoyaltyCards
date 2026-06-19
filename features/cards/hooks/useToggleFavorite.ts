/**
 * useToggleFavorite Hook
 * Story 9.2: Mark Card as Favorite
 *
 * Toggles a card's `isFavorite` flag with an optimistic UI update: the flipped
 * state is surfaced immediately via `onUpdate`, the change is persisted to
 * SQLite, and the optimistic update is rolled back if the write fails (AC1, AC6).
 *
 * Cloud sync (AC4) and Watch push (AC5) are handled downstream by the
 * repository's `toggleFavorite` / existing sync infrastructure — nothing extra
 * is required here.
 */

import { useCallback, useRef, useState } from 'react';

import { toggleFavorite } from '@/core/database';
import { LoyaltyCard } from '@/core/schemas';
import { logger } from '@/core/utils/logger';

export interface UseToggleFavoriteReturn {
  /** Toggle the card's favourite state (optimistic, with rollback on failure) */
  toggle: () => void;
  /** Whether the persistence write is currently in flight */
  isPending: boolean;
}

/**
 * Hook for toggling a loyalty card's favourite state.
 *
 * @param card - The card to toggle. `null` is tolerated as a no-op so callers
 *   can satisfy the Rules of Hooks before their card has finished loading.
 * @param onUpdate - Receives the optimistically-updated card (and the original
 *   again on rollback) so the parent can reflect the new state instantly.
 */
export function useToggleFavorite(
  card: LoyaltyCard | null,
  onUpdate: (updated: LoyaltyCard) => void
): UseToggleFavoriteReturn {
  const [isPending, setIsPending] = useState(false);
  // Re-entry guard: ignore taps while a write is in flight so a rapid double-tap
  // can't desync the optimistic state from the persisted value. Complements the
  // `disabled={isPending}` wiring at the call site (defence in depth, and it makes
  // the guard provable independently of how the caller wires the control).
  const isTogglingRef = useRef(false);

  const toggle = useCallback(() => {
    if (!card || isTogglingRef.current) {
      return;
    }
    isTogglingRef.current = true;

    const previous = card.isFavorite;
    onUpdate({ ...card, isFavorite: !previous }); // optimistic
    setIsPending(true);

    toggleFavorite(card.id)
      .catch((err) => {
        logger.error('Failed to toggle favourite:', err);
        onUpdate({ ...card, isFavorite: previous }); // rollback
      })
      .finally(() => {
        isTogglingRef.current = false;
        setIsPending(false);
      });
  }, [card, onUpdate]);

  return { toggle, isPending };
}
