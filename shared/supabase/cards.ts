import { parseWithLogging } from '@/core/schemas';
import { CloudCardRow } from '@/core/sync';

import { getSupabaseClient } from './client';
import { cloudLoyaltyCardSchema } from './schemas';

export const upsertCards = async (cards: CloudCardRow[]): Promise<{ error: string | null }> => {
  const invalidRows = cards.filter(
    (row) => parseWithLogging(cloudLoyaltyCardSchema, row, 'supabase:upsertCards') === null
  );

  if (invalidRows.length > 0) {
    return { error: `Validation failed for ${invalidRows.length} card(s) before cloud upload.` };
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from('loyalty_cards').upsert(cards, { onConflict: 'id' });

  return { error: error?.message ?? null };
};

/**
 * Fetch all cards for a user from Supabase.
 * Returns raw CloudCardRow[] cast without Zod validation at this layer — rows
 * are validated downstream by `cloudRowToLocalCard()` in `core/sync/mappers.ts`,
 * which applies `parseWithLogging` against `loyaltyCardSchema`. Invalid rows
 * are safely skipped during merge (see `downloadCloudCards`).
 */
export const fetchCards = async (
  userId: string
): Promise<{ data: CloudCardRow[]; error: string | null }> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('loyalty_cards').select('*').eq('user_id', userId);

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as CloudCardRow[], error: null };
};

/**
 * Fetch cards modified after a given ISO 8601 timestamp (delta download).
 * When `since` is null, falls back to fetching ALL cards (full download).
 *
 * Uses `gt('updated_at', since)` to leverage the `updated_at` column index.
 * Rows are validated downstream by `cloudRowToLocalCard()`.
 */
export const fetchCardsSince = async (
  userId: string,
  since: string | null
): Promise<{ data: CloudCardRow[]; error: string | null }> => {
  if (since === null) {
    return fetchCards(userId);
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('loyalty_cards')
    .select('*')
    .eq('user_id', userId)
    .gt('updated_at', since);

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as CloudCardRow[], error: null };
};

/**
 * Delete a single card from the Supabase loyalty_cards table.
 * Scoped to the user_id to respect RLS.
 */
export const deleteCardFromCloud = async (
  cardId: string,
  userId: string
): Promise<{ error: string | null }> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('loyalty_cards')
    .delete()
    .eq('id', cardId)
    .eq('user_id', userId);

  return { error: error?.message ?? null };
};
