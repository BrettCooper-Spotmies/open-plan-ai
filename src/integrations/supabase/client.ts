// Supabase browser client. Import: import { supabase } from "@/integrations/supabase/client"
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_PUBLISHABLE_KEY = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || ''
).trim();

/**
 * Auth flow: `pkce` is recommended for new apps. Keep `implicit` if your Supabase email
 * recovery links rely on hash fragments (see src/normalizeRecoveryUrl.ts).
 *
 * Note: GoTrue still returns access/refresh tokens in the JSON body for /auth/v1/token.
 * true httpOnly cookies require a server-side session (BFF, Next.js + @supabase/ssr, etc.);
 * a static Vite SPA cannot move those tokens into httpOnly cookies by client config alone.
 */
const authFlow = import.meta.env.VITE_SUPABASE_AUTH_FLOW === 'pkce' ? 'pkce' : 'implicit';

if (import.meta.env.PROD && (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY)) {
  console.error(
    '[Open Plan AI] Production build is missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY).'
  );
}

// Singleton guard: ensures only one GoTrueClient exists when Vite HMR re-evaluates this module.
type SupabaseClient = ReturnType<typeof createClient<Database>>;
declare global { var __supabaseClient: SupabaseClient | undefined; }

export const supabase: SupabaseClient = globalThis.__supabaseClient ?? (
  globalThis.__supabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: authFlow,
    },
  })
);
