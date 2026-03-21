/**
 * Supabase Edge Function: delete-account
 *
 * Story 6.10: Delete Account — GDPR right to erasure.
 *
 * Deletes the authenticated user's auth.users record using the
 * service-role key (auto-injected by Supabase runtime).
 * ON DELETE CASCADE in the DB schema handles:
 *   - loyalty_cards  (user_id FK)
 *   - users profile  (id FK)
 *   - privacy_log    (user_id FK)
 *
 * This is the ONLY server-side code in the project.
 * Deno runtime — NOT Node.js.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Create admin client with service-role key (auto-injected by Supabase runtime)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 2. Verify the calling user's JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const {
      data: { user },
      error: authError
    } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Delete the auth user — ON DELETE CASCADE handles:
    //    - loyalty_cards (user_id FK)
    //    - users profile (id FK)
    //    - privacy_log (user_id FK)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Failed to delete user:', user.id, deleteError.message);
      return new Response(JSON.stringify({ error: 'Failed to delete account' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Account deleted:', user.id); // operational log (no PII)
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('delete-account error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
