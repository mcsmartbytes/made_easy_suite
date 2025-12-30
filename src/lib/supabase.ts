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

// Validate a parent app's Supabase access token
export async function validateParentToken(token: string): Promise<{
  valid: boolean;
  email?: string;
  userId?: string;
  error?: string;
}> {
  try {
    // Create a new client with the provided token to get the user
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      return { valid: false, error: error.message };
    }

    if (!user || !user.email) {
      return { valid: false, error: 'No user found for token' };
    }

    return {
      valid: true,
      email: user.email,
      userId: user.id,
    };
  } catch (error: any) {
    console.error('Token validation error:', error);
    return { valid: false, error: 'Failed to validate token' };
  }
}
