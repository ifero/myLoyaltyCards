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
