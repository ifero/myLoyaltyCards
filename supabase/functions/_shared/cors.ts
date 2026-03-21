/**
 * Shared CORS headers for Supabase Edge Functions.
 *
 * Story 6.10: Delete Account — Edge Function infrastructure.
 *
 * Used by all Edge Functions to handle cross-origin requests.
 * The wildcard origin is acceptable for a mobile app
 * where the Supabase client sends its own auth header.
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
