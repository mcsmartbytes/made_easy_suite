import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedAdminClient: SupabaseClient | null = null;
let cachedError: Error | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdminClient) return cachedAdminClient;
  if (cachedError) throw cachedError;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // eslint-disable-next-line no-console
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set. Falling back to NEXT_PUBLIC_SUPABASE_ANON_KEY for admin client.');
  }

  if (!supabaseUrl || !serviceRoleKey) {
    cachedError = new Error('Supabase admin client is missing required environment variables.');
    throw cachedError;
  }

  cachedAdminClient = createSupabaseClient(supabaseUrl, serviceRoleKey);
  return cachedAdminClient;
}

// Also export as supabaseAdmin for backward compatibility
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get: (_, prop) => {
    const client = getSupabaseAdmin();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});
