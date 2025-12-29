import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create Supabase client - uses public schema for now
// TODO: Create 'suite' schema and migrate when ready
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});

// Helper to get supabase client for specific schema
export function getSchemaClient(schema: 'suite' | 'expenses' | 'books' | 'crm' | 'sitesense' | 'sealn') {
  return createClient(supabaseUrl, supabaseAnonKey, {
    db: { schema }
  });
}
